/**
 * Colour-by-age palettes.
 *
 * The engine tracks how many consecutive generations each cell has been alive.
 * Mapping that age onto a colour ramp is what turns a black-and-white textbook
 * demo into something that reads as generative art: still lifes settle into the
 * deep end of the ramp while gliders and wavefronts stay bright, so structure
 * and motion separate visually.
 *
 * Ages are bucketed into AGE_BANDS bands on a logarithmic curve. Most of the
 * interesting variation happens in the first few generations of a cell's life,
 * so a linear ramp would waste the whole palette on cells that all look alike.
 */

import type { CellStyle } from './gridRenderer';

export interface Palette {
  id: string;
  name: string;
  description: string;
  /** Canvas background, also the gutter colour between cells. */
  background: string;
  /** Ramp anchors from newborn (bright) to long-lived (deep). */
  stops: string[];
}

export const PALETTES: Palette[] = [
  {
    id: 'neon',
    name: 'Neon',
    description: 'Cool cyan newborns cooling through blue into deep violet.',
    background: '#07080d',
    stops: ['#eafffb', '#5eead4', '#22d3ee', '#3b82f6', '#7c3aed', '#3b0764'],
  },
  {
    id: 'ember',
    name: 'Ember',
    description: 'White-hot births burning down through amber to dark rust.',
    background: '#0f0805',
    stops: ['#fff8e7', '#ffd166', '#f9844a', '#e63946', '#9d0208', '#3d0a0a'],
  },
  {
    id: 'ink',
    name: 'Ink',
    description: 'Monochrome wash — the structure with none of the colour.',
    background: '#0a0b0e',
    stops: ['#f8fafc', '#cbd5e1', '#94a3b8', '#64748b', '#3f4a5c', '#232b38'],
  },
  {
    id: 'flora',
    name: 'Flora',
    description: 'Pale chartreuse settling into moss and deep forest green.',
    background: '#060a07',
    stops: ['#f7ffe0', '#d9f99d', '#84cc16', '#15803d', '#14532d', '#052e16'],
  },
];

/** Number of distinct colours in a ramp. */
export const AGE_BANDS = 32;

/** Age at which a cell reaches the deep end of the ramp. */
const AGE_SATURATION = 60;

/**
 * age -> band lookup, built once. `key()` runs for every cell every frame, so
 * a table read beats recomputing a logarithm two million times a second.
 */
const AGE_TO_BAND = buildAgeTable();

function buildAgeTable(): Uint8Array {
  const table = new Uint8Array(AGE_SATURATION + 1);
  const denominator = Math.log1p(AGE_SATURATION - 1);
  for (let age = 1; age <= AGE_SATURATION; age++) {
    const t = Math.log1p(age - 1) / denominator;
    table[age] = 1 + Math.min(AGE_BANDS - 1, Math.round(t * (AGE_BANDS - 1)));
  }
  return table;
}

function bandFor(age: number): number {
  if (age <= 0) return 0;
  return age >= AGE_SATURATION ? AGE_BANDS : AGE_TO_BAND[age];
}

// --- Colour maths ----------------------------------------------------------

function parseHex(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function toHex([r, g, b]: [number, number, number]): string {
  return `#${((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1)}`;
}

/** Expand a handful of anchor stops into `count` evenly spaced colours. */
export function buildRamp(stops: string[], count: number): string[] {
  const anchors = stops.map(parseHex);
  const ramp: string[] = [];
  for (let i = 0; i < count; i++) {
    const position = (i / Math.max(1, count - 1)) * (anchors.length - 1);
    const low = Math.min(anchors.length - 1, Math.floor(position));
    const high = Math.min(anchors.length - 1, low + 1);
    const t = position - low;
    ramp.push(
      toHex([
        Math.round(anchors[low][0] + (anchors[high][0] - anchors[low][0]) * t),
        Math.round(anchors[low][1] + (anchors[high][1] - anchors[low][1]) * t),
        Math.round(anchors[low][2] + (anchors[high][2] - anchors[low][2]) * t),
      ]),
    );
  }
  return ramp;
}

/** Colour a cell by how long it has been continuously alive. */
export function ageStyle(palette: Palette): CellStyle {
  const ramp = buildRamp(palette.stops, AGE_BANDS);
  return {
    background: palette.background,
    key: (alive, age) => (alive === 0 ? 0 : bandFor(age)),
    color: (key) => ramp[key - 1],
  };
}

/** Flat alive/dead colouring, for comparison against the age ramp. */
export function flatStyle(palette: Palette): CellStyle {
  const color = buildRamp(palette.stops, AGE_BANDS)[Math.floor(AGE_BANDS * 0.35)];
  return {
    background: palette.background,
    key: (alive) => alive,
    color: () => color,
  };
}

export function styleFor(palette: Palette, colorByAge: boolean): CellStyle {
  return colorByAge ? ageStyle(palette) : flatStyle(palette);
}
