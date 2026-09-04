import { describe, expect, it } from 'vitest';
import { LifeGrid } from './lifeGrid';
import { PATTERNS, PATTERN_BY_ID } from './patterns';
import { parseRule } from './rule';
import { RULE_PRESETS } from './presets';

const LIFE = parseRule('B3/S23');

describe('pattern definitions', () => {
  it('has unique ids and non-empty cells', () => {
    const ids = PATTERNS.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const pattern of PATTERNS) {
      expect(pattern.cells.length).toBeGreaterThan(0);
      expect(PATTERN_BY_ID.get(pattern.id)).toBe(pattern);
    }
  });

  it('keeps every cell inside its declared bounding box', () => {
    for (const pattern of PATTERNS) {
      for (const [x, y] of pattern.cells) {
        expect(x).toBeGreaterThanOrEqual(0);
        expect(y).toBeGreaterThanOrEqual(0);
        expect(x).toBeLessThan(pattern.width);
        expect(y).toBeLessThan(pattern.height);
      }
    }
  });
});

describe('stamping', () => {
  it('places a pattern at the given origin', () => {
    const grid = new LifeGrid({ width: 20, height: 20 });
    const glider = PATTERN_BY_ID.get('glider')!;
    grid.stamp(glider.cells, 5, 6);
    expect(grid.population).toBe(5);
    expect(grid.get(6, 6)).toBe(1); // the '.#.' in row 0 lands at x = 5 + 1
    expect(grid.get(5, 8)).toBe(1); // '###' row starts at the origin column
  });

  it('drops out-of-range cells unless wrapping is requested', () => {
    const glider = PATTERN_BY_ID.get('glider')!;

    // Glider cells are (1,0) (2,1) (0,2) (1,2) (2,2). From origin (8,8) on a
    // 10x10 grid only (1,0) -> (9,8) lands inside; the rest fall off.
    const bounded = new LifeGrid({ width: 10, height: 10 });
    bounded.stamp(glider.cells, 8, 8);
    expect(bounded.population).toBe(1);
    expect(bounded.get(9, 8)).toBe(1);

    // From origin (9,9) every cell is off-grid, so nothing is placed at all.
    const allOff = new LifeGrid({ width: 10, height: 10 });
    allOff.stamp(glider.cells, 9, 9);
    expect(allOff.population).toBe(0);

    // Wrapping keeps all five: (1,0) -> (10,9) -> (0,9), (2,1) -> (1,0), etc.
    const wrapped = new LifeGrid({ width: 10, height: 10 });
    wrapped.stamp(glider.cells, 9, 9, true);
    expect(wrapped.population).toBe(5);
    expect(wrapped.get(0, 9)).toBe(1);
    expect(wrapped.get(1, 0)).toBe(1);
  });
});

describe('known pattern behaviour under Conway rules', () => {
  it('fires a glider from the Gosper gun every 30 generations', () => {
    const gun = PATTERN_BY_ID.get('gosperglidergun')!;
    const grid = new LifeGrid({ width: 90, height: 60 });
    grid.stamp(gun.cells, 2, 2);
    const gunCells = grid.population;

    for (let i = 0; i < 30; i++) grid.step(LIFE, 'bounded');
    expect(grid.population).toBe(gunCells + 5);

    for (let i = 0; i < 30; i++) grid.step(LIFE, 'bounded');
    expect(grid.population).toBe(gunCells + 10);

    for (let i = 0; i < 30; i++) grid.step(LIFE, 'bounded');
    expect(grid.population).toBe(gunCells + 15);
  });

  it('returns the pulsar to its starting state every 3 generations', () => {
    const pulsar = PATTERN_BY_ID.get('pulsar')!;
    const grid = new LifeGrid({ width: 30, height: 30 });
    grid.stamp(pulsar.cells, 8, 8);
    const start = grid.cells.slice();

    grid.step(LIFE, 'bounded');
    expect(grid.cells).not.toEqual(start);
    grid.step(LIFE, 'bounded');
    grid.step(LIFE, 'bounded');
    expect(grid.cells).toEqual(start);
  });

  it('moves the lightweight spaceship two cells sideways every 4 generations', () => {
    const lwss = PATTERN_BY_ID.get('lwss')!;
    const grid = new LifeGrid({ width: 40, height: 20 });
    grid.stamp(lwss.cells, 2, 8);

    const expected = new LifeGrid({ width: 40, height: 20 });
    expected.stamp(lwss.cells, 4, 8);

    for (let i = 0; i < 4; i++) grid.step(LIFE, 'bounded');
    expect(grid.cells).toEqual(expected.cells);
  });

  it('runs the R-pentomino for over a thousand generations before settling', () => {
    const r = PATTERN_BY_ID.get('rpentomino')!;
    const grid = new LifeGrid({ width: 200, height: 200 });
    grid.stamp(r.cells, 98, 98);

    let previous = grid.cells.slice();
    let lastChange = 0;
    for (let i = 1; i <= 1200; i++) {
      grid.step(LIFE, 'bounded');
      if (!grid.cells.every((v, j) => v === previous[j])) lastChange = i;
      previous = grid.cells.slice();
    }
    // It stabilises (up to still-moving gliders) around generation 1103.
    expect(lastChange).toBeGreaterThan(1000);
  });
});

describe('rule presets', () => {
  it('parses every preset notation and has unique ids', () => {
    const ids = RULE_PRESETS.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const preset of RULE_PRESETS) {
      expect(() => parseRule(preset.notation)).not.toThrow();
    }
  });

  it('runs Seeds as a rule where nothing survives', () => {
    const seeds = parseRule(RULE_PRESETS.find((p) => p.id === 'seeds')!.notation);
    const grid = new LifeGrid({ width: 20, height: 20 });
    grid.stamp(
      [
        [9, 9],
        [10, 9],
      ],
      0,
      0,
    );
    grid.step(seeds, 'bounded');
    // Both originals die; the cells with exactly 2 neighbours are born.
    expect(grid.get(9, 9)).toBe(0);
    expect(grid.get(10, 9)).toBe(0);
    expect(grid.population).toBeGreaterThan(0);
  });
});
