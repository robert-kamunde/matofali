// Colours from the design guide. Flag hexes are the official ones it lists.
export const COLORS = Object.freeze({
  green: '#1EB53A',
  yellow: '#FCD116',
  black: '#141414',
  blue: '#00A3DD',
  snow: '#F4F7FB',
  rock: '#7A6553',
  wood: '#8A5A2B',
  red: '#D6452F',
  skyTop: '#0B1324',
  skyBottom: '#172440',
  mountain: '#1B2A45',
  mountainSnow: '#2B3D5E',
  star: '#CFD8E6',
  ink: '#EEF3F8',
});

export const BRICK_COLORS = Object.freeze({
  green: COLORS.green,
  yellow: COLORS.yellow,
  blue: COLORS.blue,
  snow: COLORS.snow,
  red: COLORS.red,
  black: COLORS.black,
  rock: COLORS.rock,
  wood: COLORS.wood,
});

export const POWER_UP_STYLE = Object.freeze({
  wide: { fill: COLORS.green, glyph: '↔' },
  multi: { fill: COLORS.blue, glyph: '×3' },
  life: { fill: COLORS.yellow, glyph: '♥' },
});
