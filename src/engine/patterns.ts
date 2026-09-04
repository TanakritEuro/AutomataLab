/**
 * Famous Game of Life patterns, defined as ASCII art so they stay readable and
 * verifiable against the literature. '#' (or 'O') is a live cell.
 *
 * These are Conway-rule patterns; under other rules they will simply do
 * something else, which is itself worth seeing.
 */

export interface Pattern {
  id: string;
  name: string;
  /** What it does, for the picker tooltip. */
  blurb: string;
  width: number;
  height: number;
  /** Live cell offsets from the pattern's top-left corner. */
  cells: ReadonlyArray<readonly [number, number]>;
}

function fromRows(id: string, name: string, blurb: string, rows: string[]): Pattern {
  const cells: Array<readonly [number, number]> = [];
  let width = 0;
  rows.forEach((row, y) => {
    width = Math.max(width, row.length);
    for (let x = 0; x < row.length; x++) {
      if (row[x] === '#' || row[x] === 'O') cells.push([x, y]);
    }
  });
  return { id, name, blurb, width, height: rows.length, cells };
}

export const PATTERNS: Pattern[] = [
  fromRows('glider', 'Glider', 'The smallest spaceship: travels one cell diagonally every 4 generations.', [
    '.#.',
    '..#',
    '###',
  ]),
  fromRows('lwss', 'Lightweight spaceship', 'Travels two cells horizontally every 4 generations.', [
    '#..#.',
    '....#',
    '#...#',
    '.####',
  ]),
  fromRows('blinker', 'Blinker', 'The simplest oscillator: flips between horizontal and vertical.', [
    '###',
  ]),
  fromRows(
    'pulsar',
    'Pulsar',
    'A period-3 oscillator, and one of the most symmetric common patterns.',
    [
      '..###...###..',
      '.............',
      '#....#.#....#',
      '#....#.#....#',
      '#....#.#....#',
      '..###...###..',
      '.............',
      '..###...###..',
      '#....#.#....#',
      '#....#.#....#',
      '#....#.#....#',
      '.............',
      '..###...###..',
    ],
  ),
  fromRows(
    'rpentomino',
    'R-pentomino',
    'Five cells that take 1103 generations to settle — the classic example of a tiny seed with a huge, unpredictable future.',
    ['.##', '##.', '.#.'],
  ),
  fromRows(
    'acorn',
    'Acorn',
    'Seven cells that run for over 5000 generations and end up filling a large region.',
    ['.#.....', '...#...', '##..###'],
  ),
  fromRows(
    'gosperglidergun',
    'Gosper glider gun',
    'Emits a new glider every 30 generations — the first pattern shown to grow forever.',
    [
      '........................#...........',
      '......................#.#...........',
      '............##......##............##',
      '...........#...#....##............##',
      '##........#.....#...##..............',
      '##........#...#.##....#.#...........',
      '..........#.....#.......#...........',
      '...........#...#....................',
      '............##......................',
    ],
  ),
];

export const PATTERN_BY_ID = new Map(PATTERNS.map((p) => [p.id, p]));
