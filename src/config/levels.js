// Levels are pictures drawn in bricks. Each row is 12 characters:
// a brick letter from RULES.bricks, or "." for an empty cell.
// To add a level, append an entry here and add its two name strings to the
// translation files. No engine change is needed.

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

/** Level number (1, 2, 3 …) → its definition, cycling through LEVELS. */
export function levelDefinition(level, levels = LEVELS) {
  return levels[(level - 1) % levels.length];
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
