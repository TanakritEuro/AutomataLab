/**
 * Canvas renderer for 1D elementary automata.
 *
 * Each generation is painted as one row beneath the last, so time runs down the
 * image and the 2D picture that builds up *is* the automaton's history. Once
 * the canvas is full the image scrolls up by one row per generation.
 *
 * Scrolling is a single self-blit rather than a repaint of the whole history:
 * we never keep the past rows in memory at all, the canvas is the record.
 */

import type { CellStyle } from './gridRenderer';

export interface StripGeometry {
  cols: number;
  /** Visible rows of history. */
  rows: number;
  cellSize: number;
  devicePixelRatio: number;
}

export class StripRenderer {
  private readonly canvas: HTMLCanvasElement;
  private readonly ctx: CanvasRenderingContext2D;

  private cols = 0;
  private rows = 0;
  private cellDevice = 0;
  /** Next row to paint; once it reaches `rows` the image starts scrolling. */
  private cursor = 0;

  constructor(canvas: HTMLCanvasElement) {
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) throw new Error('2D canvas context unavailable');
    this.canvas = canvas;
    this.ctx = ctx;
  }

  configure({ cols, rows, cellSize, devicePixelRatio: dpr }: StripGeometry): boolean {
    const cellDevice = Math.max(1, Math.round(cellSize * dpr));
    if (this.cols === cols && this.rows === rows && this.cellDevice === cellDevice) return false;

    this.cols = cols;
    this.rows = rows;
    this.cellDevice = cellDevice;
    this.canvas.width = cols * cellDevice;
    this.canvas.height = rows * cellDevice;
    this.canvas.style.width = `${(cols * cellDevice) / dpr}px`;
    this.canvas.style.height = `${(rows * cellDevice) / dpr}px`;
    return true;
  }

  /** Wipe the history and start again from the top. */
  reset(style: CellStyle): void {
    this.ctx.fillStyle = style.background;
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    this.cursor = 0;
  }

  /** Paint one generation as the next row. */
  pushRow(cells: Uint8Array, age: Uint16Array, style: CellStyle): void {
    if (this.cols === 0) return;
    const { ctx, cellDevice } = this;

    let y: number;
    if (this.cursor < this.rows) {
      y = this.cursor * cellDevice;
      this.cursor++;
    } else {
      // Full: shift everything up one row and paint into the freed bottom row.
      y = (this.rows - 1) * cellDevice;
      ctx.drawImage(this.canvas, 0, -cellDevice);
    }

    ctx.fillStyle = style.background;
    ctx.fillRect(0, y, this.canvas.width, cellDevice);

    for (let x = 0; x < this.cols; x++) {
      const key = style.key(cells[x], age[x]);
      if (key === 0) continue;
      ctx.fillStyle = style.color(key);
      ctx.fillRect(x * cellDevice, y, cellDevice, cellDevice);
    }
  }
}
