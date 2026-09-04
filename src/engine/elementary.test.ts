import { describe, expect, it } from 'vitest';
import { ElementaryAutomaton, NEIGHBOURHOODS, outputFor, toggleOutput } from './elementary';

function evolve(rule: number, width: number, generations: number, wrap = false): string[] {
  const automaton = new ElementaryAutomaton(width);
  automaton.seedSingle();
  const rows = [automaton.toString()];
  for (let i = 0; i < generations; i++) {
    automaton.step(rule, wrap);
    rows.push(automaton.toString());
  }
  return rows;
}

describe('rule bit decoding', () => {
  it('reads Wolfram numbering with the left neighbour as the high bit', () => {
    // Rule 30 = 0b00011110: neighbourhoods 001, 010, 011 and 100 give 1.
    expect(outputFor(30, [0, 0, 1])).toBe(1);
    expect(outputFor(30, [0, 1, 0])).toBe(1);
    expect(outputFor(30, [0, 1, 1])).toBe(1);
    expect(outputFor(30, [1, 0, 0])).toBe(1);
    expect(outputFor(30, [1, 0, 1])).toBe(0);
    expect(outputFor(30, [1, 1, 1])).toBe(0);
  });

  it('reconstructs the rule number from its eight outputs', () => {
    for (const rule of [0, 30, 90, 110, 150, 184, 255]) {
      const bits = NEIGHBOURHOODS.map((n) => outputFor(rule, n));
      // NEIGHBOURHOODS runs 111 down to 000, i.e. bit 7 first.
      const rebuilt = bits.reduce((acc, bit, i) => acc | (bit << (7 - i)), 0);
      expect(rebuilt).toBe(rule);
    }
  });

  it('toggles a single output bit', () => {
    expect(toggleOutput(30, [0, 0, 1])).toBe(28);
    expect(toggleOutput(28, [0, 0, 1])).toBe(30);
  });
});

describe('ElementaryAutomaton — known rules', () => {
  it('Rule 90 draws a Sierpinski triangle from a single cell', () => {
    const rows = evolve(90, 17, 4);
    expect(rows).toEqual([
      '........#........',
      '.......#.#.......',
      '......#...#......',
      '.....#.#.#.#.....',
      '....#.......#....',
    ]);
  });

  it('Rule 90 is the XOR of its two neighbours', () => {
    const automaton = new ElementaryAutomaton(9);
    automaton.seedRandom(0.5, mulberry(7));
    const before = [...automaton.cells];
    automaton.step(90, false);
    for (let x = 0; x < 9; x++) {
      const left = x > 0 ? before[x - 1] : 0;
      const right = x < 8 ? before[x + 1] : 0;
      expect(automaton.cells[x]).toBe(left ^ right);
    }
  });

  it('Rule 30 is asymmetric and chaotic from a single cell', () => {
    const rows = evolve(30, 17, 4);
    expect(rows).toEqual([
      '........#........',
      '.......###.......',
      '......##..#......',
      '.....##.####.....',
      '....##..#...#....',
    ]);
  });

  it('Rule 110 grows only to the left from a single cell', () => {
    // Hand-derived: 110 = 0b01101110, so 001/010/011/101/110 -> 1 and
    // 000/100/111 -> 0. The gap in row 3 is the cell that sees 111.
    const rows = evolve(110, 17, 4);
    expect(rows).toEqual([
      '........#........',
      '.......##........',
      '......###........',
      '.....##.#........',
      '....#####........',
    ]);
  });

  it('Rule 0 kills everything and Rule 255 fills everything', () => {
    const dead = new ElementaryAutomaton(11);
    dead.seedSingle();
    dead.step(0);
    expect(dead.population).toBe(0);

    const full = new ElementaryAutomaton(11);
    full.seedSingle();
    full.step(255);
    expect(full.population).toBe(11);
  });

  it('Rule 184 conserves the number of live cells', () => {
    const automaton = new ElementaryAutomaton(64);
    automaton.seedRandom(0.4, mulberry(99));
    const initial = automaton.population;
    for (let i = 0; i < 50; i++) automaton.step(184, true);
    expect(automaton.population).toBe(initial);
  });
});

describe('ElementaryAutomaton — edges and bookkeeping', () => {
  it('wraps the row into a ring when asked', () => {
    const automaton = new ElementaryAutomaton(5);
    automaton.cells.fill(0);
    automaton.cells[0] = 1;
    automaton.population = 1;
    automaton.step(90, true);
    // Rule 90 XORs neighbours; wrapping makes cell 4 see the live cell 0.
    expect(automaton.toString()).toBe('.#..#');
  });

  it('treats off-row neighbours as dead when not wrapping', () => {
    const automaton = new ElementaryAutomaton(5);
    automaton.cells[0] = 1;
    automaton.population = 1;
    automaton.step(90, false);
    expect(automaton.toString()).toBe('.#...');
  });

  it('tracks age down columns and resets it on death', () => {
    const automaton = new ElementaryAutomaton(17);
    automaton.seedSingle();
    const middle = 8;
    expect(automaton.age[middle]).toBe(1);

    // Under Rule 90 the centre column dies immediately, then returns.
    automaton.step(90, false);
    expect(automaton.cells[middle]).toBe(0);
    expect(automaton.age[middle]).toBe(0);

    // Under Rule 110 a live centre survives, so its age climbs.
    const survivor = new ElementaryAutomaton(17);
    survivor.seedSingle();
    survivor.step(110, false);
    survivor.step(110, false);
    expect(survivor.cells[middle]).toBe(1);
    expect(survivor.age[middle]).toBe(3);
  });

  it('reports population and generation as it runs', () => {
    const automaton = new ElementaryAutomaton(21);
    automaton.seedSingle();
    expect(automaton.generation).toBe(0);
    expect(automaton.population).toBe(1);
    automaton.step(90, false);
    expect(automaton.generation).toBe(1);
    expect(automaton.population).toBe(2);
  });

  it('rejects rows too narrow to have neighbours', () => {
    expect(() => new ElementaryAutomaton(2)).toThrow();
  });
});

/** Small deterministic RNG so seeded tests are reproducible. */
function mulberry(seed: number): () => number {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
