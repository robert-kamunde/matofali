// Paddles and balls the player can choose on the Style screen. Each one after
// the first is unlocked by playing (DECISIONS D-25); nothing is bought.
// Unlock kinds read the player's progress:
//   level    highest level reached
//   score    best score
//   bricks   bricks broken in all games
//   flawless levels cleared without losing a life, in all games
//   games    games started

const Y = '#FCD116';
const W = '#F4F7FB';

// A paddle is drawn as a horizontal gradient: [offset 0–1, colour] stops.
export const PADDLES = Object.freeze([
  {
    id: 'classic',
    nameKey: 'paddle.classic',
    unlock: null,
    stops: [[0, Y], [0.12, Y], [0.12, W], [0.88, W], [0.88, Y], [1, Y]],
  },
  {
    id: 'ocean',
    nameKey: 'paddle.ocean',
    unlock: { kind: 'level', n: 5 },
    stops: [[0, W], [0.12, W], [0.12, '#00A3DD'], [0.88, '#0077B6'], [0.88, W], [1, W]],
  },
  {
    id: 'bendera',
    nameKey: 'paddle.bendera',
    unlock: { kind: 'level', n: 10 },
    stops: [
      [0, '#1EB53A'], [0.42, '#1EB53A'], [0.42, Y], [0.46, Y], [0.46, '#000'], [0.54, '#000'],
      [0.54, Y], [0.58, Y], [0.58, '#00A3DD'], [1, '#00A3DD'],
    ],
  },
  {
    id: 'kanga',
    nameKey: 'paddle.kanga',
    unlock: { kind: 'score', n: 5000 },
    stops: Array.from({ length: 8 }, (_, i) => [
      [i / 8, i % 2 ? Y : '#D6452F'],
      [(i + 1) / 8, i % 2 ? Y : '#D6452F'],
    ]).flat(),
  },
  {
    id: 'mninga',
    nameKey: 'paddle.mninga',
    unlock: { kind: 'bricks', n: 1000 },
    stops: [[0, '#5C3A1E'], [0.1, '#5C3A1E'], [0.1, '#8A5A2B'], [0.5, '#A66F38'], [0.9, '#8A5A2B'], [0.9, '#5C3A1E'], [1, '#5C3A1E']],
  },
  {
    id: 'dhahabu',
    nameKey: 'paddle.dhahabu',
    unlock: { kind: 'flawless', n: 10 },
    stops: [[0, '#B8860B'], [0.3, '#F5C542'], [0.5, '#FFF1B0'], [0.7, '#F5C542'], [1, '#B8860B']],
  },
]);

// A ball has a fill, a small highlight and an optional ring.
export const BALLS = Object.freeze([
  { id: 'classic', nameKey: 'ball.classic', unlock: null, fill: '#FFFFFF', highlight: Y },
  { id: 'jua', nameKey: 'ball.jua', unlock: { kind: 'bricks', n: 250 }, fill: Y, highlight: '#FFFFFF' },
  { id: 'barafu', nameKey: 'ball.barafu', unlock: { kind: 'level', n: 8 }, fill: '#9BE3FF', highlight: '#FFFFFF' },
  { id: 'moto', nameKey: 'ball.moto', unlock: { kind: 'score', n: 2500 }, fill: '#FF7A3D', highlight: '#FFD166' },
  { id: 'usiku', nameKey: 'ball.usiku', unlock: { kind: 'games', n: 10 }, fill: '#1A2233', highlight: '#00A3DD', ring: '#FFFFFF' },
  { id: 'dhahabu', nameKey: 'ball.dhahabu', unlock: { kind: 'level', n: 25 }, fill: '#F5C542', highlight: '#FFF1B0', ring: '#B8860B' },
]);

export const DEFAULT_PADDLE = PADDLES[0].id;
export const DEFAULT_BALL = BALLS[0].id;

export const paddleById = (id) => PADDLES.find((p) => p.id === id) || PADDLES[0];
export const ballById = (id) => BALLS.find((b) => b.id === id) || BALLS[0];

/** How far the player is towards an unlock: { have, need, done }. */
export function unlockProgress(unlock, progress) {
  if (!unlock) return { have: 0, need: 0, done: true };
  const have = Math.max(0, Math.floor(progress[unlock.kind] || 0));
  return { have: Math.min(have, unlock.n), need: unlock.n, done: have >= unlock.n };
}

export const isUnlocked = (item, progress) => unlockProgress(item.unlock, progress).done;

/** Every unlocked item as 'paddle:id' and 'ball:id' strings. */
export function unlockedKeys(progress) {
  return new Set([
    ...PADDLES.filter((p) => isUnlocked(p, progress)).map((p) => `paddle:${p.id}`),
    ...BALLS.filter((b) => isUnlocked(b, progress)).map((b) => `ball:${b.id}`),
  ]);
}
