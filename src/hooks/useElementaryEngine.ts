/**
 * React glue for the 1D elementary automata view.
 *
 * Mirrors useLifeEngine's shape, with one structural difference: the canvas is
 * the history. Each tick appends a row rather than repainting a grid, so the
 * loop pushes one row per generation and never redraws the past.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ElementaryAutomaton, type Seed } from '../engine/elementary';
import type { CellStyle } from '../render/gridRenderer';
import { StripRenderer } from '../render/stripRenderer';
import { downloadCanvasPng } from '../render/exportPng';

export interface ElementaryEngineConfig {
  /** Cells across the row. */
  cols: number;
  /** Visible generations of history. */
  rows: number;
  rule: number;
  seed: Seed;
  wrap: boolean;
  running: boolean;
  speed: number;
  cellSize: number;
  style: CellStyle;
}

export interface ElementaryStats {
  generation: number;
  population: number;
  tps: number;
}

const MAX_STEPS_PER_FRAME = 16;
const STATS_INTERVAL_MS = 250;
/** Rate is averaged over a full second so low speeds do not read as jitter. */
const RATE_WINDOW_MS = 1000;

export function useElementaryEngine(config: ElementaryEngineConfig) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rendererRef = useRef<StripRenderer | null>(null);

  const latest = useRef(config);
  useEffect(() => {
    latest.current = config;
  });

  const [stats, setStats] = useState<ElementaryStats>({
    generation: 0,
    population: 0,
    tps: 0,
  });

  const automaton = useMemo(() => new ElementaryAutomaton(config.cols), [config.cols]);

  const attachCanvas = useCallback((canvas: HTMLCanvasElement | null) => {
    canvasRef.current = canvas;
    rendererRef.current = canvas ? new StripRenderer(canvas) : null;
  }, []);

  /**
   * Restart from the seed row. Signalled to the loop rather than done inline so
   * the first row is always painted by the same code path as every other row.
   */
  const restartRequested = useRef(true);
  const restart = useCallback(() => {
    restartRequested.current = true;
  }, []);

  // Anything that changes the shape of the image starts a fresh drawing.
  useEffect(() => {
    restart();
  }, [config.cols, config.rows, config.rule, config.seed, config.wrap, config.style, restart]);

  useEffect(() => {
    rendererRef.current?.configure({
      cols: config.cols,
      rows: config.rows,
      cellSize: config.cellSize,
      devicePixelRatio: window.devicePixelRatio || 1,
    });
    restart();
  }, [config.cols, config.rows, config.cellSize, restart]);

  useEffect(() => {
    let frame = 0;
    let previous = performance.now();
    let accumulator = 0;
    let lastSample = previous;
    let ticksInWindow = 0;
    let windowStart = previous;
    let measuredTps = 0;

    const tick = (now: number) => {
      frame = requestAnimationFrame(tick);
      const renderer = rendererRef.current;
      if (!renderer) return;

      const { running, speed, rule, wrap, seed, style } = latest.current;
      const delta = now - previous;
      previous = now;

      if (restartRequested.current) {
        restartRequested.current = false;
        automaton.seed(seed);
        renderer.reset(style);
        renderer.pushRow(automaton.cells, automaton.age, style);
        accumulator = 0;
        setStats((s) => ({ ...s, generation: 0, population: automaton.population }));
      }

      if (running && speed > 0) {
        accumulator += delta;
        const interval = 1000 / speed;
        let steps = 0;
        while (accumulator >= interval && steps < MAX_STEPS_PER_FRAME) {
          automaton.step(rule, wrap);
          renderer.pushRow(automaton.cells, automaton.age, style);
          accumulator -= interval;
          steps++;
        }
        ticksInWindow += steps;
        if (steps === MAX_STEPS_PER_FRAME) accumulator = 0;
      } else {
        accumulator = 0;
      }

      if (now - windowStart >= RATE_WINDOW_MS) {
        measuredTps = Math.round((ticksInWindow * 1000) / (now - windowStart));
        ticksInWindow = 0;
        windowStart = now;
      }

      if (now - lastSample >= STATS_INTERVAL_MS) {
        setStats({
          generation: automaton.generation,
          population: automaton.population,
          tps: measuredTps,
        });
        lastSample = now;
      }
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [automaton]);

  const stepOnce = useCallback(() => {
    const renderer = rendererRef.current;
    if (!renderer) return;
    const { rule, wrap, style } = latest.current;
    automaton.step(rule, wrap);
    renderer.pushRow(automaton.cells, automaton.age, style);
    setStats((s) => ({
      ...s,
      generation: automaton.generation,
      population: automaton.population,
    }));
  }, [automaton]);

  const exportPng = useCallback((filename: string) => {
    if (canvasRef.current) downloadCanvasPng(canvasRef.current, filename);
  }, []);

  return {
    attachCanvas,
    stats,
    actions: { stepOnce, restart, exportPng },
  };
}
