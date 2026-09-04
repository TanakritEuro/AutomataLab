/**
 * Life-like rule handling.
 *
 * A "life-like" cellular automaton is defined entirely by two sets of
 * neighbour counts: how many live neighbours cause a dead cell to be born,
 * and how many keep a live cell alive. Conway's Game of Life is B3/S23.
 *
 * Rules are represented as two fixed-length boolean arrays indexed by
 * neighbour count (0-8), which makes lookup a single array read in the hot
 * loop and maps one-to-one onto the digit toggle buttons in the UI.
 */

export const NEIGHBOUR_COUNTS = [0, 1, 2, 3, 4, 5, 6, 7, 8] as const;

export interface LifeRule {
  /** birth[n] === true -> a dead cell with n live neighbours becomes alive. */
  readonly birth: readonly boolean[];
  /** survive[n] === true -> a live cell with n live neighbours stays alive. */
  readonly survive: readonly boolean[];
}

function emptyMask(): boolean[] {
  return [false, false, false, false, false, false, false, false, false];
}

/** Build a rule from digit lists, e.g. maskFrom([3]) for the birth half of Life. */
export function ruleFromCounts(birth: readonly number[], survive: readonly number[]): LifeRule {
  const b = emptyMask();
  const s = emptyMask();
  for (const n of birth) if (n >= 0 && n <= 8) b[n] = true;
  for (const n of survive) if (n >= 0 && n <= 8) s[n] = true;
  return { birth: b, survive: s };
}

/** Return a copy of `rule` with one birth/survival digit flipped. */
export function toggleRuleDigit(rule: LifeRule, kind: 'birth' | 'survive', digit: number): LifeRule {
  const birth = [...rule.birth];
  const survive = [...rule.survive];
  const target = kind === 'birth' ? birth : survive;
  target[digit] = !target[digit];
  return { birth, survive };
}

function digitsOf(mask: readonly boolean[]): number[] {
  const out: number[] = [];
  for (let n = 0; n <= 8; n++) if (mask[n]) out.push(n);
  return out;
}

/** Serialise to canonical "B3/S23" notation. */
export function formatRule(rule: LifeRule): string {
  return `B${digitsOf(rule.birth).join('')}/S${digitsOf(rule.survive).join('')}`;
}

/**
 * Parse "B3/S23" (or the legacy survival-first "23/3") notation.
 * Throws on anything it cannot make sense of, so callers can surface the error.
 */
export function parseRule(input: string): LifeRule {
  const text = input.trim().toUpperCase().replace(/\s+/g, '');
  const bs = /^B([0-8]*)\/?S([0-8]*)$/.exec(text);
  if (bs) return ruleFromCounts(toDigits(bs[1]), toDigits(bs[2]));

  const legacy = /^([0-8]*)\/([0-8]*)$/.exec(text);
  if (legacy) return ruleFromCounts(toDigits(legacy[2]), toDigits(legacy[1]));

  throw new Error(`Unrecognised rule string: "${input}"`);
}

function toDigits(chunk: string): number[] {
  return [...chunk].map(Number);
}

/** Plain-English description of a rule, used by the educational panel. */
export function describeRule(rule: LifeRule): string {
  const b = digitsOf(rule.birth);
  const s = digitsOf(rule.survive);
  const list = (ns: number[]) =>
    ns.length === 0
      ? 'no'
      : ns.length === 1
        ? `exactly ${ns[0]}`
        : `${ns.slice(0, -1).join(', ')} or ${ns[ns.length - 1]}`;

  const birthPart =
    b.length === 0
      ? 'A dead cell never comes to life.'
      : `A dead cell is born when it has ${list(b)} live neighbours.`;
  const survivePart =
    s.length === 0
      ? 'Every live cell dies each generation.'
      : `A live cell survives with ${list(s)} live neighbours, and dies otherwise.`;

  return `${birthPart} ${survivePart}`;
}
