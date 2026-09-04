/**
 * The 2D life-like simulation engine.
 *
 * Pure logic: no canvas, no React, no DOM. Everything the renderer needs is
 * exposed as flat typed arrays so drawing can iterate them directly.
 *
 * Performance notes
 * -----------------
 * Neighbour counting uses a column-sum sweep rather than the naive 8-lookup
 * loop. For each row we build `colSum[x]` = the vertical 3-cell sum of the
 * column at x, then the neighbourhood of a cell is
 * `colSum[x-1] + colSum[x] + colSum[x+1] - self`. That is ~4 additions per
 * cell instead of 8 bounds-checked reads, and it keeps a 200x200 grid well
 * inside a 60fps frame budget. Buffers are allocated once and reused, so
 * stepping allocates nothing.
 */

import type { LifeRule } from './rule';

export type EdgeMode = 'toroidal' | 'bounded';

/** Age saturates so it fits a Uint16 and so palettes have a stable top end. */
export const MAX_AGE = 65535;

export interface LifeGridOptions {
  width: number;
  height: number;
}

export class LifeGrid {
  readonly width: number;
  readonly height: number;

  /** 0 = dead, 1 = alive. Row-major, length width * height. */
  readonly cells: Uint8Array;
  /**
   * Consecutive generations a cell has been alive (1 on the generation it is
   * born, 0 when dead). Drives the colour-by-age rendering.
   */
  readonly age: Uint16Array;

  generation = 0;
  population = 0;

  private next: Uint8Array;
  private nextAge: Uint16Array;
  private colSum: Int32Array;

  constructor({ width, height }: LifeGridOptions) {
    if (width < 1 || height < 1) throw new Error('Grid must be at least 1x1');
    this.width = width;
    this.height = height;
    const size = width * height;
    this.cells = new Uint8Array(size);
    this.age = new Uint16Array(size);
    this.next = new Uint8Array(size);
    this.nextAge = new Uint16Array(size);
    this.colSum = new Int32Array(width);
  }

  index(x: number, y: number): number {
    return y * this.width + x;
  }

  inBounds(x: number, y: number): boolean {
    return x >= 0 && y >= 0 && x < this.width && y < this.height;
  }

  get(x: number, y: number): number {
    return this.inBounds(x, y) ? this.cells[this.index(x, y)] : 0;
  }

  /** Set a cell alive or dead, keeping `population` and `age` consistent. */
  set(x: number, y: number, alive: boolean): void {
    if (!this.inBounds(x, y)) return;
    const i = this.index(x, y);
    const value = alive ? 1 : 0;
    if (this.cells[i] === value) return;
    this.cells[i] = value;
    this.age[i] = value;
    this.population += value === 1 ? 1 : -1;
  }

  toggle(x: number, y: number): void {
    this.set(x, y, this.get(x, y) === 0);
  }

  clear(): void {
    this.cells.fill(0);
    this.age.fill(0);
    this.generation = 0;
    this.population = 0;
  }

  /**
   * Fill the grid with random live cells.
   * @param density fraction of cells to bring to life, 0..1
   * @param random injectable RNG so tests can be deterministic
   */
  randomFill(density: number, random: () => number = Math.random): void {
    const d = Math.min(1, Math.max(0, density));
    let population = 0;
    for (let i = 0; i < this.cells.length; i++) {
      const alive = random() < d ? 1 : 0;
      this.cells[i] = alive;
      this.age[i] = alive;
      population += alive;
    }
    this.population = population;
    this.generation = 0;
  }

  /**
   * Stamp a set of live-cell offsets into the grid with its top-left corner at
   * (originX, originY). Cells landing outside the grid wrap when `wrap` is set
   * and are dropped otherwise, matching the active edge mode.
   */
  stamp(
    cells: ReadonlyArray<readonly [number, number]>,
    originX: number,
    originY: number,
    wrap = false,
  ): void {
    for (const [dx, dy] of cells) {
      let x = originX + dx;
      let y = originY + dy;
      if (wrap) {
        x = ((x % this.width) + this.width) % this.width;
        y = ((y % this.height) + this.height) % this.height;
      }
      this.set(x, y, true);
    }
  }

  /**
   * Advance the simulation by one generation.
   *
   * Boundary behaviour is a parameter rather than grid state: like the rule,
   * it describes how the world evolves, not what it currently contains. That
   * keeps the grid a plain container the caller can re-evolve any way it likes
   * without having to mutate it first.
   */
  step(rule: LifeRule, edgeMode: EdgeMode = 'toroidal'): void {
    const { width: w, height: h, cells, age, next, nextAge, colSum } = this;
    const { birth, survive } = rule;
    const toroidal = edgeMode === 'toroidal';
    let population = 0;

    for (let y = 0; y < h; y++) {
      const row = y * w;
      const rowUp = y > 0 ? row - w : toroidal ? (h - 1) * w : -1;
      const rowDown = y < h - 1 ? row + w : toroidal ? 0 : -1;

      // Vertical 3-cell sums for this row band.
      for (let x = 0; x < w; x++) {
        let sum = cells[row + x];
        if (rowUp >= 0) sum += cells[rowUp + x];
        if (rowDown >= 0) sum += cells[rowDown + x];
        colSum[x] = sum;
      }

      for (let x = 0; x < w; x++) {
        const i = row + x;
        const self = cells[i];
        let n = colSum[x] - self;
        if (x > 0) n += colSum[x - 1];
        else if (toroidal) n += colSum[w - 1];
        if (x < w - 1) n += colSum[x + 1];
        else if (toroidal) n += colSum[0];

        const alive = self === 1 ? survive[n] : birth[n];
        if (alive) {
          next[i] = 1;
          // Saturating increment keeps long-lived cells pinned at the top of
          // the palette instead of wrapping back to "newborn".
          const prior = age[i];
          nextAge[i] = prior < MAX_AGE ? prior + 1 : MAX_AGE;
          population++;
        } else {
          next[i] = 0;
          nextAge[i] = 0;
        }
      }
    }

    cells.set(next);
    age.set(nextAge);
    this.population = population;
    this.generation++;
  }

  /** Copy another grid's contents into this one (same dimensions required). */
  copyFrom(other: LifeGrid): void {
    if (other.width !== this.width || other.height !== this.height) {
      throw new Error('Grid dimensions must match to copy');
    }
    this.cells.set(other.cells);
    this.age.set(other.age);
    this.generation = other.generation;
    this.population = other.population;
  }

  /** Coordinates of every live cell — convenient for assertions in tests. */
  liveCells(): Array<[number, number]> {
    const out: Array<[number, number]> = [];
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        if (this.cells[y * this.width + x] === 1) out.push([x, y]);
      }
    }
    return out;
  }
}
