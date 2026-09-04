/**
 * Glue between the pure engine, the canvas renderer and React.
 *
 * React state is deliberately kept out of the hot path: the grid is stepped and
 * drawn inside a requestAnimationFrame loop that reads its settings from a ref,
 * so a 240x160 grid running at 60 ticks/second triggers no React re-renders at
 * all. Only the stats readout is pushed into state, four times a second.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { LifeGrid, type EdgeMode } from '../engine/lifeGrid';
import type { LifeRule } from '../engine/rule';
import { GridRenderer, type CellStyle } from '../render/gridRenderer';
import { downloadCanvasPng } from '../render/exportPng';
import type { Pattern } from '../engine/patterns';

export interface LifeEngineConfig {
  cols: number;
  rows: number;
  rule: LifeRule;
  edgeMode: EdgeMode;
  running: boolean;
  /** Target simulation ticks per second. */
  speed: number;
  cellSize: number;
  gap: number;
  style: CellStyle;
  /** When set, clicking stamps this pattern instead of painting cells. */
  stamp: Pattern | null;
}

export interface LifeStats {
  generation: number;
  population: number;
  /** Measured ticks per second, not the requested target. */
  tps: number;
}

/** Cap on catch-up steps per frame so a slow tab cannot spiral. */
const MAX_STEPS_PER_FRAME = 16;
/** How often generation/population are pushed to React. */
const STATS_INTERVAL_MS = 250;
/**
 * Rate is measured over a longer window than it is displayed. At 15 tps a
 * 250ms window catches 3 or 4 ticks, which reads as a rate flickering between
 * 12 and 16; a full second of ticks is enough for the number to sit still.
 */
const RATE_WINDOW_MS = 1000;

export function useLifeEngine(config: LifeEngineConfig) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rendererRef = useRef<GridRenderer | null>(null);

  // Latest config, readable from the animation loop without restarting it.
  const latest = useRef(config);
  useEffect(() => {
    latest.current = config;
  });

  const [stats, setStats] = useState<LifeStats>({ generation: 0, population: 0, tps: 0 });

  // Only a change of dimensions needs a new grid. Rule, speed and edge mode
  // are read per-tick from `latest`, so changing them never loses the pattern.
  const grid = useMemo(
    () => new LifeGrid({ width: config.cols, height: config.rows }),
    [config.cols, config.rows],
  );

  // Attach the renderer to the canvas element once it exists.
  const attachCanvas = useCallback((canvas: HTMLCanvasElement | null) => {
    canvasRef.current = canvas;
    rendererRef.current = canvas ? new GridRenderer(canvas) : null;
  }, []);

  // Keep canvas geometry in sync with the grid size / zoom level.
  useEffect(() => {
    rendererRef.current?.configure({
      cols: config.cols,
      rows: config.rows,
      cellSize: config.cellSize,
      gap: config.gap,
      devicePixelRatio: window.devicePixelRatio || 1,
    });
  }, [config.cols, config.rows, config.cellSize, config.gap]);

  // A change of colour scheme means every cell must be repainted.
  useEffect(() => {
    rendererRef.current?.invalidate();
  }, [config.style]);

  // The single animation loop: advance time, step, draw, sample stats.
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

      const { running, speed, rule, style, edgeMode } = latest.current;
      const delta = now - previous;
      previous = now;

      if (running && speed > 0) {
        accumulator += delta;
        const interval = 1000 / speed;
        let steps = 0;
        while (accumulator >= interval && steps < MAX_STEPS_PER_FRAME) {
          grid.step(rule, edgeMode);
          accumulator -= interval;
          steps++;
        }
        ticksInWindow += steps;
        // Fell behind badly (background tab, huge grid): drop the backlog
        // rather than trying to replay it.
        if (steps === MAX_STEPS_PER_FRAME) accumulator = 0;
      } else {
        accumulator = 0;
      }

      renderer.draw(grid, style);

      if (now - windowStart >= RATE_WINDOW_MS) {
        measuredTps = Math.round((ticksInWindow * 1000) / (now - windowStart));
        ticksInWindow = 0;
        windowStart = now;
      }

      if (now - lastSample >= STATS_INTERVAL_MS) {
        setStats({
          generation: grid.generation,
          population: grid.population,
          tps: measuredTps,
        });
        lastSample = now;
      }
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [grid]);

  /** Push stats immediately after a manual action, without waiting for a sample. */
  const syncStats = useCallback(() => {
    setStats((s) => ({ ...s, generation: grid.generation, population: grid.population }));
  }, [grid]);

  const stepOnce = useCallback(() => {
    grid.step(latest.current.rule, latest.current.edgeMode);
    syncStats();
  }, [grid, syncStats]);

  const clear = useCallback(() => {
    grid.clear();
    syncStats();
  }, [grid, syncStats]);

  const randomFill = useCallback(
    (density: number) => {
      grid.randomFill(density);
      syncStats();
    },
    [grid, syncStats],
  );

  const exportPng = useCallback(
    (filename: string) => {
      if (canvasRef.current) downloadCanvasPng(canvasRef.current, filename);
    },
    [],
  );

  // --- Pointer drawing -----------------------------------------------------
  // A drag paints one value the whole time (decided by the cell under the
  // initial press) rather than toggling, so crossing a cell twice is harmless.
  // When a pattern is armed, a click stamps it instead of painting.
  const paintValue = useRef(1);
  const lastCell = useRef<{ x: number; y: number } | null>(null);

  const cellFromEvent = useCallback((event: React.PointerEvent<HTMLCanvasElement>) => {
    const renderer = rendererRef.current;
    const canvas = canvasRef.current;
    if (!renderer || !canvas) return null;
    const rect = canvas.getBoundingClientRect();
    return renderer.cellAt(
      event.clientX - rect.left,
      event.clientY - rect.top,
      window.devicePixelRatio || 1,
    );
  }, []);

  const onPointerDown = useCallback(
    (event: React.PointerEvent<HTMLCanvasElement>) => {
      const cell = cellFromEvent(event);
      if (!cell) return;
      const { stamp, edgeMode } = latest.current;

      if (stamp) {
        // Centre the pattern on the cursor so what you see is what you place.
        grid.stamp(
          stamp.cells,
          cell.x - (stamp.width >> 1),
          cell.y - (stamp.height >> 1),
          edgeMode === 'toroidal',
        );
        syncStats();
        return;
      }

      event.currentTarget.setPointerCapture(event.pointerId);
      paintValue.current = grid.get(cell.x, cell.y) === 1 ? 0 : 1;
      grid.set(cell.x, cell.y, paintValue.current === 1);
      lastCell.current = cell;
      syncStats();
    },
    [grid, cellFromEvent, syncStats],
  );

  const onPointerMove = useCallback(
    (event: React.PointerEvent<HTMLCanvasElement>) => {
      if (lastCell.current === null) return;
      const cell = cellFromEvent(event);
      if (!cell) return;
      // Join up fast drags so the stroke has no gaps.
      drawLine(lastCell.current, cell, (x, y) => grid.set(x, y, paintValue.current === 1));
      lastCell.current = cell;
      syncStats();
    },
    [grid, cellFromEvent, syncStats],
  );

  const onPointerUp = useCallback((event: React.PointerEvent<HTMLCanvasElement>) => {
    lastCell.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  }, []);

  return {
    attachCanvas,
    stats,
    actions: { stepOnce, clear, randomFill, exportPng },
    pointerHandlers: { onPointerDown, onPointerMove, onPointerUp, onPointerCancel: onPointerUp },
  };
}

/** Integer Bresenham line, used to fill gaps between pointer samples. */
function drawLine(
  from: { x: number; y: number },
  to: { x: number; y: number },
  plot: (x: number, y: number) => void,
): void {
  let { x, y } = from;
  const dx = Math.abs(to.x - x);
  const dy = -Math.abs(to.y - y);
  const sx = x < to.x ? 1 : -1;
  const sy = y < to.y ? 1 : -1;
  let error = dx + dy;

  for (;;) {
    plot(x, y);
    if (x === to.x && y === to.y) return;
    const doubled = 2 * error;
    if (doubled >= dy) {
      error += dy;
      x += sx;
    }
    if (doubled <= dx) {
      error += dx;
      y += sy;
    }
  }
}
