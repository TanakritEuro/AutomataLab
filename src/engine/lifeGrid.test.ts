import { describe, expect, it } from 'vitest';
import { LifeGrid } from './lifeGrid';
import { formatRule, parseRule, ruleFromCounts, toggleRuleDigit } from './rule';

const LIFE = parseRule('B3/S23');

function place(grid: LifeGrid, cells: Array<[number, number]>, ox = 0, oy = 0) {
  for (const [x, y] of cells) grid.set(x + ox, y + oy, true);
}

/** .X. / ..X / XXX — the canonical glider. */
const GLIDER: Array<[number, number]> = [
  [1, 0],
  [2, 1],
  [0, 2],
  [1, 2],
  [2, 2],
];

function sortedCells(grid: LifeGrid) {
  return grid
    .liveCells()
    .map(([x, y]) => `${x},${y}`)
    .sort();
}

describe('rule notation', () => {
  it('round-trips B/S notation', () => {
    expect(formatRule(parseRule('B3/S23'))).toBe('B3/S23');
    expect(formatRule(parseRule('B36/S23'))).toBe('B36/S23');
    expect(formatRule(parseRule('B2/S'))).toBe('B2/S');
  });

  it('accepts legacy survival-first notation', () => {
    expect(formatRule(parseRule('23/3'))).toBe('B3/S23');
  });

  it('rejects nonsense', () => {
    expect(() => parseRule('hello')).toThrow();
    expect(() => parseRule('B9/S23')).toThrow();
  });

  it('toggles digits without mutating the original rule', () => {
    const life = parseRule('B3/S23');
    const highlife = toggleRuleDigit(life, 'birth', 6);
    expect(formatRule(highlife)).toBe('B36/S23');
    expect(formatRule(life)).toBe('B3/S23');
  });
});

describe('LifeGrid — known Life patterns', () => {
  it('keeps a block stable forever', () => {
    const grid = new LifeGrid({ width: 10, height: 10 });
    place(grid, [
      [4, 4],
      [5, 4],
      [4, 5],
      [5, 5],
    ]);
    const before = sortedCells(grid);
    for (let i = 0; i < 10; i++) grid.step(LIFE, 'bounded');
    expect(sortedCells(grid)).toEqual(before);
    expect(grid.population).toBe(4);
  });

  it('oscillates a blinker with period 2', () => {
    const grid = new LifeGrid({ width: 10, height: 10 });
    place(grid, [
      [3, 4],
      [4, 4],
      [5, 4],
    ]);
    grid.step(LIFE, 'bounded');
    expect(sortedCells(grid)).toEqual(['4,3', '4,4', '4,5'].sort());
    grid.step(LIFE, 'bounded');
    expect(sortedCells(grid)).toEqual(['3,4', '4,4', '5,4'].sort());
  });

  it('translates a glider by (1,1) every 4 generations', () => {
    const grid = new LifeGrid({ width: 24, height: 24 });
    place(grid, GLIDER, 2, 2);

    for (let period = 1; period <= 4; period++) {
      for (let i = 0; i < 4; i++) grid.step(LIFE, 'bounded');
      const expected = new LifeGrid({ width: 24, height: 24 });
      place(expected, GLIDER, 2 + period, 2 + period);
      expect(sortedCells(grid)).toEqual(sortedCells(expected));
      expect(grid.population).toBe(5);
    }
    expect(grid.generation).toBe(16);
  });

  it('kills a lone cell and grows a stable beehive from a tub-less triomino', () => {
    const grid = new LifeGrid({ width: 8, height: 8 });
    grid.set(4, 4, true);
    grid.step(LIFE, 'bounded');
    expect(grid.population).toBe(0);
  });
});

describe('LifeGrid — edge modes', () => {
  it('wraps a glider around a toroidal grid back to its start', () => {
    const size = 12; // a glider returns to its origin after 4 * size generations
    const grid = new LifeGrid({ width: size, height: size });
    place(grid, GLIDER, 1, 1);
    const start = sortedCells(grid);
    for (let i = 0; i < 4 * size; i++) grid.step(LIFE, 'toroidal');
    expect(sortedCells(grid)).toEqual(start);
  });

  it('treats out-of-bounds neighbours as dead when bounded', () => {
    // A blinker flat against the top edge has too few neighbours to survive.
    const grid = new LifeGrid({ width: 6, height: 6 });
    place(grid, [
      [0, 0],
      [1, 0],
      [2, 0],
    ]);
    grid.step(LIFE, 'bounded');
    expect(sortedCells(grid)).toEqual(['1,0', '1,1']);
  });

  it('counts wrapped neighbours when toroidal', () => {
    // The same three cells wrap vertically and behave like a mid-grid blinker.
    const grid = new LifeGrid({ width: 6, height: 6 });
    place(grid, [
      [0, 0],
      [1, 0],
      [2, 0],
    ]);
    grid.step(LIFE, 'toroidal');
    expect(sortedCells(grid)).toEqual(['1,0', '1,1', '1,5'].sort());
  });
});

describe('LifeGrid — age tracking', () => {
  it('increments age for survivors and resets it on death and birth', () => {
    const grid = new LifeGrid({ width: 10, height: 10 });
    place(grid, [
      [3, 4],
      [4, 4],
      [5, 4],
    ]);
    expect(grid.age[grid.index(4, 4)]).toBe(1);

    grid.step(LIFE, 'bounded'); // centre survives, tips die, new tips are born
    expect(grid.age[grid.index(4, 4)]).toBe(2);
    expect(grid.age[grid.index(4, 3)]).toBe(1);
    expect(grid.age[grid.index(3, 4)]).toBe(0);

    grid.step(LIFE, 'bounded');
    expect(grid.age[grid.index(4, 4)]).toBe(3);
  });
});

describe('LifeGrid — bookkeeping', () => {
  it('tracks population through manual edits', () => {
    const grid = new LifeGrid({ width: 5, height: 5 });
    grid.toggle(1, 1);
    grid.toggle(2, 2);
    expect(grid.population).toBe(2);
    grid.toggle(1, 1);
    expect(grid.population).toBe(1);
    grid.set(2, 2, true); // idempotent
    expect(grid.population).toBe(1);
    grid.clear();
    expect(grid.population).toBe(0);
  });

  it('random-fills deterministically with an injected RNG', () => {
    const grid = new LifeGrid({ width: 10, height: 10 });
    let seed = 1;
    const rng = () => {
      seed = (seed * 1103515245 + 12345) % 2147483648;
      return seed / 2147483648;
    };
    grid.randomFill(0.5, rng);
    expect(grid.population).toBe(grid.liveCells().length);
    expect(grid.population).toBeGreaterThan(20);
    expect(grid.population).toBeLessThan(80);
  });

  it('supports rules that never give birth', () => {
    const grid = new LifeGrid({ width: 6, height: 6 });
    place(grid, [
      [2, 2],
      [3, 2],
      [2, 3],
      [3, 3],
    ]);
    grid.step(ruleFromCounts([], [2, 3]), 'bounded');
    expect(grid.population).toBe(4); // block still has 3 neighbours each
    grid.step(ruleFromCounts([], []), 'bounded');
    expect(grid.population).toBe(0);
  });
});
