import { Game } from '../../src/engine/game.js';
import { sequenceRng } from '../../src/engine/rng.js';

/** A game in the PLAYING state with a single test level and recorded events. */
export function playingGame({ rows, rng = sequenceRng([0.5]), level } = {}) {
  const events = [];
  const levels = rows
    ? [{ id: 't', nameKey: 'x', subtitleKey: 'y', rows }]
    : undefined;
  const game = new Game({ rng, onEvent: (e) => events.push(e), ...(levels ? { levels } : {}) });
  game.newGame();
  if (level) {
    game.level = level;
    game.loadLevel();
  }
  game.begin();
  return { game, events };
}

export const EMPTY_ROW = '............';
/** A level with one brick far from the action so the board is never cleared by accident. */
export const ONE_CORNER_BRICK = ['g...........'];

export function types(events) {
  return events.map((e) => e.type);
}

/** Places the only ball at x,y with the given velocity. */
export function setBall(game, x, y, vx, vy) {
  game.balls = [{ x, y, r: game.rules.ball.radius, vx, vy, stuck: false }];
  return game.balls[0];
}
