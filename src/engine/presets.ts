/**
 * Named life-like rules worth exploring.
 *
 * Life is only one point in a space of 2^18 life-like rules. These are the
 * handful that produce visibly different characters of behaviour — useful both
 * as a playground and as an illustration that "interesting" is a narrow band
 * between rules that die out and rules that fill the grid with noise.
 */

export interface RulePreset {
  id: string;
  name: string;
  notation: string;
  /** What makes this rule worth looking at, in one sentence. */
  blurb: string;
}

export const RULE_PRESETS: RulePreset[] = [
  {
    id: 'life',
    name: "Conway's Life",
    notation: 'B3/S23',
    blurb:
      'The original. Balanced right on the edge between dying out and overcrowding, which is why it supports gliders, oscillators and — in principle — universal computation.',
  },
  {
    id: 'highlife',
    name: 'HighLife',
    notation: 'B36/S23',
    blurb:
      'Life plus birth on 6 neighbours. That one extra digit is enough to produce a replicator: a small pattern that copies itself indefinitely.',
  },
  {
    id: 'seeds',
    name: 'Seeds',
    notation: 'B2/S',
    blurb:
      'Nothing ever survives — every live cell dies each generation. Growth happens entirely through birth, giving explosive, firework-like sprays.',
  },
  {
    id: 'daynight',
    name: 'Day & Night',
    notation: 'B3678/S34678',
    blurb:
      'Symmetric under swapping live and dead: any pattern behaves identically on an inverted background. Produces large interacting blobs and long-lived spaceships.',
  },
  {
    id: 'maze',
    name: 'Maze',
    notation: 'B3/S12345',
    blurb:
      'Life with far more generous survival. Growth spreads and then freezes into intricate maze-like corridors that keep extending at their tips.',
  },
  {
    id: 'diamoeba',
    name: 'Diamoeba',
    notation: 'B35678/S5678',
    blurb:
      'Large amoeba-like blobs with restless, churning boundaries. Small seeds usually die; big ones grow into diamond-shaped colonies.',
  },
  {
    id: 'replicator',
    name: 'Replicator',
    notation: 'B1357/S1357',
    blurb:
      'Every pattern reproduces itself into multiple copies, building fractal, Sierpinski-like structures from any starting shape.',
  },
];

export const DEFAULT_PRESET = RULE_PRESETS[0];
