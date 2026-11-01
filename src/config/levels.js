// Levels are pictures drawn in bricks. Each row is 12 characters:
// a brick letter from RULES.bricks, or "." for an empty cell.
// To add a level, append an entry here and add its two name strings to the
// translation files. No engine change is needed.
//
// After the hand-made levels the game is endless: every later level is
// generated from its level number (DECISIONS D-23), so level 37 is always the
// same layout for every player.

import { createRng } from '../engine/rng.js';

export const LEVELS = Object.freeze([
  {
    id: 'bendera',
    nameKey: 'level.bendera.name',
    subtitleKey: 'level.bendera.subtitle',
    // The flag's diagonal: green top-left, black band edged in yellow, blue bottom-right.
    rows: [
      'gggggggggyky',
      'ggggggggykyb',
      'gggggggykybb',
      'ggggggykybbb',
      'gggggykybbbb',
      'ggggykybbbbb',
      'gggykybbbbbb',
      'ggykybbbbbbb',
      'gykybbbbbbbb',
      'ykybbbbbbbbb',
    ],
  },
  {
    id: 'kilimanjaro',
    nameKey: 'level.kilimanjaro.name',
    subtitleKey: 'level.kilimanjaro.subtitle',
    // Snow cap on a rock mountain, standing on green land with yellow flowers.
    rows: [
      '.....ss.....',
      '....ssss....',
      '...ssrrss...',
      '...rrrrrr...',
      '..rrrrrrrr..',
      '.rrrrrrrrrr.',
      'ggrrrrrrrrgg',
      'gggggggggggg',
      'gyggyggyggyg',
      'gggggggggggg',
    ],
  },
  {
    id: 'zanzibar',
    nameKey: 'level.zanzibar.name',
    subtitleKey: 'level.zanzibar.subtitle',
    // A carved wooden door frame with a red lintel and yellow brass studs.
    rows: [
      '..dddddddd..',
      '.dooooooood.',
      '.dyoyoyoyod.',
      '.dddddddddd.',
      '.dy..dd..yd.',
      '.d...dd...d.',
      '.dy..dd..yd.',
      '.d...dd...d.',
      '.dy..dd..yd.',
      '.dddddddddd.',
    ],
  },
  {
    id: 'serengeti',
    nameKey: 'level.serengeti.name',
    subtitleKey: 'level.serengeti.subtitle',
    // Blue sky and yellow sun above acacia green, black details and a red-yellow kanga band.
    rows: [
      'bbbbbbbbbbbb',
      'bbbyyybbbbbb',
      'bbyyyyybbbbb',
      'bbbyyybbbbbb',
      '............',
      'g.ggg..ggg.g',
      '.k.k.kk.k.k.',
      'gggggggggggg',
      'oyoyoyoyoyoy',
      'gggggggggggg',
    ],
  },
]);

/**
 * Level number (1, 2, 3 …) → its definition. The hand-made levels come first;
 * after them each level is generated. Passing generate = null cycles through
 * `levels` instead, which tests use with their own small boards.
 */
export function levelDefinition(level, levels = LEVELS, generate = generateLevel) {
  if (level <= levels.length || !generate) return levels[(level - 1) % levels.length];
  return generate(level);
}

// Pattern shapes for generated levels. Each returns whether the cell at row r
// (of rows) and column c of the left half (0 = outer edge, 5 = next to the
// centre) holds a brick; the right half mirrors the left.
const HALF = 6;
const PATTERNS = Object.freeze({
  stripes: (r) => r % 3 !== 2,
  diamond: (r, c, rows) => Math.abs(r - (rows - 1) / 2) + (HALF - 1 - c) <= rows / 2 + 1,
  pyramid: (r, c, rows) => HALF - 1 - c <= Math.floor(((r + 1) * HALF) / rows),
  fortress: (r, c, rows) => r === 0 || r === rows - 1 || c === 0 || (c >= HALF - 2 && r >= 2 && r <= rows - 3),
  waves: (r, c) => (r + Math.floor(c / 2)) % 3 !== 0,
  checker: (r, c) => (r + c) % 2 === 0,
  scatter: (r, c, rows, rng) => rng() < 0.7,
});
export const PATTERN_IDS = Object.freeze(Object.keys(PATTERNS));

const COLOURS = ['g', 'y', 'b', 's', 'o'];
const MIN_BRICKS = 24;
const generated = new Map();

/** How hard a generated level is. Grows slowly, then levels off. */
export function generatedDifficulty(level) {
  const t = Math.max(0, level - (LEVELS.length + 1));
  return {
    rows: Math.min(10, 6 + Math.floor(t / 3)),
    toughShare: Math.min(0.45, 0.1 + 0.02 * t),
    woodShare: t < 4 ? 0 : Math.min(0.2, 0.02 * (t - 3)),
  };
}

/** Builds the generated level for a level number. Same number, same layout. */
export function generateLevel(level) {
  if (generated.has(level)) return generated.get(level);
  const rng = createRng((Math.imul(level, 2654435761) ^ 0x6d61746f) >>> 0);
  const { rows, toughShare, woodShare } = generatedDifficulty(level);
  const patternId = PATTERN_IDS[Math.floor(rng() * PATTERN_IDS.length)];
  const inPattern = PATTERNS[patternId];
  const shuffled = [...COLOURS].sort(() => rng() - 0.5);
  const palette = shuffled.slice(0, 2 + Math.floor(rng() * 2));
  const tough = rng() < 0.5 ? 'k' : 'r';

  const cell = (r, filled) => {
    if (!filled) return '.';
    const roll = rng();
    if (roll < woodShare) return 'd';
    if (roll < woodShare + toughShare) return tough;
    return palette[r % palette.length];
  };
  const half = [];
  for (let r = 0; r < rows; r++) {
    let row = '';
    for (let c = 0; c < HALF; c++) row += cell(r, inPattern(r, c, rows, rng));
    half.push(row);
  }
  // Too sparse to be a real level: fill the empty cells of the top rows.
  let count = half.join('').replace(/\./g, '').length * 2;
  for (let r = 0; r < rows && count < MIN_BRICKS; r++) {
    half[r] = half[r].replace(/\./g, () => {
      count += 2;
      return palette[r % palette.length];
    });
  }
  const def = Object.freeze({
    id: `generated-${level}`,
    nameKey: `level.pattern.${patternId}`,
    subtitleKey: 'level.generated.subtitle',
    generated: true,
    rows: Object.freeze(half.map((h) => h + [...h].reverse().join(''))),
  });
  generated.set(level, def);
  return def;
}

/** Throws if a level is malformed. Used by tests and at start-up. */
export function validateLevel(def, rules) {
  const { cols, maxRows } = rules.grid;
  if (!def.id || !def.nameKey || !def.subtitleKey) throw new Error('Level needs id, nameKey and subtitleKey');
  if (!Array.isArray(def.rows) || def.rows.length === 0 || def.rows.length > maxRows) {
    throw new Error(`Level ${def.id} must have 1 to ${maxRows} rows`);
  }
  let bricks = 0;
  def.rows.forEach((row, r) => {
    if (row.length !== cols) throw new Error(`Level ${def.id} row ${r + 1} has ${row.length} cells, expected ${cols}`);
    for (const ch of row) {
      if (ch === '.') continue;
      if (!rules.bricks[ch]) throw new Error(`Level ${def.id} row ${r + 1} uses unknown brick "${ch}"`);
      bricks++;
    }
  });
  if (bricks === 0) throw new Error(`Level ${def.id} has no bricks`);
  return true;
}
