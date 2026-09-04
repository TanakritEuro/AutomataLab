/**
 * Canvas renderer for a 2D grid.
 *
 * Kept deliberately dumb and framework-free: it knows how to paint cells and
 * how to avoid painting the ones that did not change. It never reads React
 * state and never owns the simulation.
 *
 * Redraw strategy: the renderer remembers the visual "key" it last painted for
 * every cell and repaints only the cells whose key changed. On a settled grid
 * that is a handful of rects per frame instead of tens of thousands, which is
 * what keeps 200x140 smooth and flicker-free. A full repaint happens only when
 * the geometry or the colour scheme changes.
 */

import type { LifeGrid } from '../engine/lifeGrid';

export interface CellStyle {
  /** Painted behind everything; also shows through as the grid gutter. */
  background: string;
  /**
   * Visual bucket for a cell. Cells sharing a key render identically, and a
   * key of 0 means "draw as background". Colour-by-age uses the age band here.
   */
  key(alive: number, age: number): number;
  /** CSS colour for a non-zero key. Called once per key and cached. */
  color(key: number): string;
}

/** Flat alive/dead colouring — the step-3 baseline before colour-by-age. */
export function binaryStyle(alive: string, background: string): CellStyle {
  return {
    background,
    key: (isAlive) => isAlive,
    color: () => alive,
  };
}

export interface RendererGeometry {
  cols: number;
  rows: number;
  /** Cell edge length in CSS pixels. */
  cellSize: number;
  /** Gutter between cells in CSS pixels; 0 disables the grid look. */
  gap: number;
  devicePixelRatio: number;
}

export class GridRenderer {
  private readonly canvas: HTMLCanvasElement;
  private readonly ctx: CanvasRenderingContext2D;

  private cols = 0;
  private rows = 0;
  private cellDevice = 0;
  private gapDevice = 0;

  /** Last painted key per cell; null until the first configure(). */
  private painted: Uint16Array | null = null;
  private colorCache = new Map<number, string>();
  private needsFullRedraw = true;

  constructor(canvas: HTMLCanvasElement) {
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) throw new Error('2D canvas context unavailable');
    this.canvas = canvas;
    this.ctx = ctx;
  }

  /**
   * Size the canvas for the given grid geometry. Work happens in device
   * pixels with integer rects so cell edges stay crisp on HiDPI screens.
   */
  configure({ cols, rows, cellSize, gap, devicePixelRatio: dpr }: RendererGeometry): void {
    const cellDevice = Math.max(1, Math.round(cellSize * dpr));
    const gapDevice = cellDevice > 3 ? Math.max(0, Math.round(gap * dpr)) : 0;
    const width = cols * cellDevice;
    const height = rows * cellDevice;

    const unchanged =
      this.cols === cols &&
      this.rows === rows &&
      this.cellDevice === cellDevice &&
      this.gapDevice === gapDevice;
    if (unchanged) return;

    this.cols = cols;
    this.rows = rows;
    this.cellDevice = cellDevice;
    this.gapDevice = gapDevice;
    this.canvas.width = width;
    this.canvas.height = height;
    this.canvas.style.width = `${width / dpr}px`;
    this.canvas.style.height = `${height / dpr}px`;
    this.painted = new Uint16Array(cols * rows);
    this.invalidate();
  }

  /** Force a full repaint on the next draw (palette or geometry change). */
  invalidate(): void {
    this.needsFullRedraw = true;
    this.colorCache.clear();
  }

  /** CSS-pixel size of the canvas, for layout maths. */
  get cssWidth(): number {
    return this.canvas.clientWidth;
  }

  draw(grid: LifeGrid, style: CellStyle): void {
    const painted = this.painted;
    if (!painted || grid.width !== this.cols || grid.height !== this.rows) return;

    const { ctx, cellDevice, gapDevice } = this;
    const inner = Math.max(1, cellDevice - gapDevice);
    const { cells, age } = grid;

    if (this.needsFullRedraw) {
      ctx.fillStyle = style.background;
      ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
      painted.fill(0);
      this.needsFullRedraw = false;

      for (let i = 0; i < cells.length; i++) {
        const key = style.key(cells[i], age[i]);
        if (key === 0) continue;
        painted[i] = key;
        ctx.fillStyle = this.colorFor(style, key);
        ctx.fillRect(((i % this.cols) * cellDevice) | 0, (((i / this.cols) | 0) * cellDevice) | 0, inner, inner);
      }
      return;
    }

    // Incremental pass: only cells whose appearance changed since last frame.
    for (let y = 0; y < this.rows; y++) {
      const rowOffset = y * this.cols;
      const py = y * cellDevice;
      for (let x = 0; x < this.cols; x++) {
        const i = rowOffset + x;
        const key = style.key(cells[i], age[i]);
        if (key === painted[i]) continue;
        painted[i] = key;
        const px = x * cellDevice;
        if (key === 0) {
          ctx.fillStyle = style.background;
          ctx.fillRect(px, py, cellDevice, cellDevice);
        } else {
          ctx.fillStyle = this.colorFor(style, key);
          ctx.fillRect(px, py, inner, inner);
        }
      }
    }
  }

  private colorFor(style: CellStyle, key: number): string {
    let color = this.colorCache.get(key);
    if (color === undefined) {
      color = style.color(key);
      this.colorCache.set(key, color);
    }
    return color;
  }

  /** Translate a pointer position (CSS px, relative to the canvas) to a cell. */
  cellAt(offsetX: number, offsetY: number, dpr: number): { x: number; y: number } | null {
    const size = this.cellDevice / dpr;
    const x = Math.floor(offsetX / size);
    const y = Math.floor(offsetY / size);
    if (x < 0 || y < 0 || x >= this.cols || y >= this.rows) return null;
    return { x, y };
  }
}
