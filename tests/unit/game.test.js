import { describe, it, expect } from 'vitest';
import { Game, STATES, pickPowerUp } from '../../src/engine/game.js';
import { RULES, ballSpeed } from '../../src/config/rules.js';
import { createRng, sequenceRng } from '../../src/engine/rng.js';
import { angleFromVertical } from '../../src/engine/physics.js';
import { playingGame, setBall, types, EMPTY_ROW, ONE_CORNER_BRICK } from './helpers.js';

const R = RULES.ball.radius;
const PAD_Y = RULES.paddle.y;

function stepUntil(game, pred, max = 5000) {
  for (let i = 0; i < max; i++) {
    if (pred()) return i;
    game.step();
  }
  throw new Error('condition never met');
}

describe('state machine', () => {
  it('runs idle → ready → playing → paused → playing', () => {
    const g = new Game();
    expect(g.state).toBe(STATES.IDLE);
    g.newGame();
    expect(g.state).toBe(STATES.READY);
    g.begin();
    expect(g.state).toBe(STATES.PLAYING);
    expect(g.pause()).toBe(true);
    expect(g.state).toBe(STATES.PAUSED);
    expect(g.resume()).toBe(true);
    expect(g.state).toBe(STATES.PLAYING);
  });

  it('refuses invalid transitions', () => {
    const g = new Game();
    expect(() => g.begin()).toThrow(/Invalid state change idle → playing/);
    expect(g.pause()).toBe(false);
    expect(g.resume()).toBe(false);
  });

  it('does not simulate while paused', () => {
    const { game } = playingGame({ rows: ONE_CORNER_BRICK });
    const b = setBall(game, 240, 300, 0, -5);
    game.pause();
    game.step();
    expect(b.y).toBe(300);
    game.resume();
    game.step();
    expect(b.y).toBeLessThan(300);
  });

  it('can quit to home from any running state', () => {
    for (const setup of [(g) => g, (g) => g.pause()]) {
      const { game } = playingGame({ rows: ONE_CORNER_BRICK });
      setup(game);
      game.quit();
      expect(game.state).toBe(STATES.IDLE);
    }
  });
});

describe('paddle', () => {
  it('follows the finger horizontally', () => {
    const { game } = playingGame({ rows: ONE_CORNER_BRICK });
    game.setPaddleTarget(100);
    for (let i = 0; i < 30; i++) game.step();
    expect(game.paddle.x).toBeCloseTo(100, 1);
  });

  it('stays inside the playfield', () => {
    const { game } = playingGame({ rows: ONE_CORNER_BRICK });
    game.setPaddleTarget(-500);
    for (let i = 0; i < 30; i++) game.step();
    expect(game.paddle.x).toBe(RULES.paddle.width / 2);
    game.setPaddleTarget(5000);
    for (let i = 0; i < 30; i++) game.step();
    expect(game.paddle.x).toBe(RULES.field.width - RULES.paddle.width / 2);
  });

  it('starts 84 units wide with the ball resting on it', () => {
    const { game } = playingGame({ rows: ONE_CORNER_BRICK });
    expect(game.paddle.w).toBe(84);
    expect(game.balls).toHaveLength(1);
    expect(game.balls[0].stuck).toBe(true);
    expect(game.balls[0].r).toBe(7);
    game.setPaddleTarget(300);
    for (let i = 0; i < 30; i++) game.step();
    expect(game.balls[0].x).toBeCloseTo(game.paddle.x, 5);
  });
});

describe('launch', () => {
  it('launches upward at the level speed within the spread', () => {
    const rng = createRng(42);
    for (let i = 0; i < 200; i++) {
      const { game } = playingGame({ rows: ONE_CORNER_BRICK, rng });
      expect(game.launch()).toBe(true);
      const b = game.balls[0];
      expect(b.vy).toBeLessThan(0);
      expect(Math.hypot(b.vx, b.vy)).toBeCloseTo(ballSpeed(1), 6);
      expect(angleFromVertical(b.vx, b.vy)).toBeLessThanOrEqual(RULES.ball.launchSpreadDeg + 1e-9);
    }
  });

  it('never produces a shallow launch even at the extremes of the random range', () => {
    for (const roll of [0, 0.999999]) {
      const { game } = playingGame({ rows: ONE_CORNER_BRICK, rng: sequenceRng([roll]) });
      game.launch();
      expect(angleFromVertical(game.balls[0].vx, game.balls[0].vy)).toBeLessThan(20);
    }
  });

  it('only launches while playing', () => {
    const g = new Game();
    g.newGame();
    expect(g.launch()).toBe(false);
  });
});

describe('walls', () => {
  it('bounces off left, right and top walls', () => {
    const { game, events } = playingGame({ rows: ONE_CORNER_BRICK });
    let b = setBall(game, R + 1, 300, -4, -1);
    game.step();
    expect(b.vx).toBeGreaterThan(0);
    b = setBall(game, RULES.field.width - R - 1, 300, 4, -1);
    game.step();
    expect(b.vx).toBeLessThan(0);
    b = setBall(game, 240, R + 1, 1, -4);
    game.step();
    expect(b.vy).toBeGreaterThan(0);
    expect(types(events).filter((t) => t === 'wall')).toHaveLength(3);
  });
});

describe('paddle bounce angles', () => {
  function bounceAt(offset) {
    const { game } = playingGame({ rows: ONE_CORNER_BRICK });
    game.paddle.x = game.paddle.target = 240;
    const b = setBall(game, 240 + offset, PAD_Y - R - 2, 0, 5);
    game.step();
    return b;
  }

  it('sends a centre hit straight up', () => {
    const b = bounceAt(0);
    expect(b.vy).toBeLessThan(0);
    expect(angleFromVertical(b.vx, b.vy)).toBeCloseTo(0, 5);
  });

  it('sends an end hit toward that side at up to 60°', () => {
    const right = bounceAt(42);
    expect(right.vx).toBeGreaterThan(0);
    expect(angleFromVertical(right.vx, right.vy)).toBeCloseTo(60, 3);
    const left = bounceAt(-42);
    expect(left.vx).toBeLessThan(0);
    expect(angleFromVertical(left.vx, left.vy)).toBeCloseTo(60, 3);
  });

  it('scales the angle with distance from centre', () => {
    const half = bounceAt(21);
    expect(angleFromVertical(half.vx, half.vy)).toBeCloseTo(30, 3);
  });

  it('keeps level speed after the bounce', () => {
    const b = bounceAt(10);
    expect(Math.hypot(b.vx, b.vy)).toBeCloseTo(ballSpeed(1), 6);
  });
});

describe('bricks', () => {
  // Brick column c, row 0 sits at x = 6 + 39c, y = 70 .. 86.
  it('a one-hit brick breaks, scores and bounces the ball', () => {
    const { game, events } = playingGame({ rows: ['.....g.....g'] });
    const brick = game.bricks[0];
    const b = setBall(game, brick.x + 18, brick.y + 16 + R + 2, 0, -5);
    game.step();
    expect(game.bricks).toHaveLength(1);
    expect(game.score).toBe(10);
    expect(b.vy).toBeGreaterThan(0);
    expect(types(events)).toContain('brickBreak');
  });

  it('a black brick cracks first, then breaks, and every hit scores', () => {
    const { game, events } = playingGame({ rows: ['.....k.....g'] });
    const brick = game.bricks[0];
    setBall(game, brick.x + 18, brick.y + 16 + R + 2, 0, -5);
    game.step();
    expect(brick.hp).toBe(1);
    expect(game.score).toBe(10);
    expect(types(events)).toContain('brickCrack');
    setBall(game, brick.x + 18, brick.y + 16 + R + 2, 0, -5);
    game.step();
    expect(game.bricks).not.toContain(brick);
    expect(game.score).toBe(20);
  });

  it('door wood takes three hits', () => {
    const { game } = playingGame({ rows: ['.....d.....g'] });
    const brick = game.bricks[0];
    for (let i = 0; i < 3; i++) {
      expect(game.bricks).toContain(brick);
      setBall(game, brick.x + 18, brick.y + 16 + R + 2, 0, -5);
      game.step();
    }
    expect(game.bricks).not.toContain(brick);
  });

  it('a ball hitting the seam of two bricks damages both and bounces once', () => {
    const { game } = playingGame({ rows: ['....gg.....g'] });
    const [a, c] = game.bricks;
    const seamX = (a.x + a.w + c.x) / 2;
    const b = setBall(game, seamX, a.y + 16 + R + 2, 0, -5);
    game.step();
    expect(game.bricks).toHaveLength(1);
    expect(game.score).toBe(20);
    expect(b.vy).toBeGreaterThan(0);
  });

  it('a corner hit reflects on both axes it was moving toward', () => {
    const { game } = playingGame({ rows: ['.....k.....g'] });
    const brick = game.bricks[0];
    // Approach the bottom-left corner diagonally from below-left.
    const b = setBall(game, brick.x - 4, brick.y + brick.h + 4, 3, -3);
    game.step();
    expect(b.vx).toBeLessThan(0);
    expect(b.vy).toBeGreaterThan(0);
  });

  it('a side hit only reverses horizontal motion', () => {
    const { game } = playingGame({ rows: ['.....k.....g'] });
    const brick = game.bricks[0];
    const b = setBall(game, brick.x - R - 1, brick.y + 8, 4, -1);
    game.step();
    expect(b.vx).toBeLessThan(0);
    expect(b.vy).toBeLessThan(0);
  });

  it('does not tunnel through a brick at maximum speed', () => {
    const { game } = playingGame({ rows: [EMPTY_ROW, '.....g.....g'] });
    const brick = game.bricks[0];
    const speed = RULES.ball.maxSpeed;
    for (let start = 0; start < 20; start += 0.5) {
      brick.hp = 1;
      if (!game.bricks.includes(brick)) game.bricks.unshift(brick);
      const b = setBall(game, brick.x + 18, brick.y + brick.h + R + 1 + start, 0, -speed);
      game.step();
      game.step();
      game.step();
      expect(b.y).toBeGreaterThan(brick.y + brick.h);
    }
  });

  it('keeps every brick bounce steeper than the shallow-angle limit', () => {
    const { game } = playingGame({ rows: ['.....k.....g'] });
    const brick = game.bricks[0];
    brick.hp = 99;
    const b = setBall(game, brick.x - R - 1, brick.y + 8, 5, -0.2);
    game.step();
    expect(angleFromVertical(b.vx, b.vy)).toBeLessThanOrEqual(RULES.ball.maxAngleFromVerticalDeg + 1e-6);
  });
});

describe('level completion and progression', () => {
  it('awards 250 and stops at level complete when the last brick breaks', () => {
    const { game, events } = playingGame({ rows: ['.....g......'] });
    const brick = game.bricks[0];
    setBall(game, brick.x + 18, brick.y + 16 + R + 2, 0, -5);
    game.step();
    expect(game.state).toBe(STATES.LEVEL_COMPLETE);
    expect(game.score).toBe(10 + 250);
    expect(types(events)).toContain('levelComplete');
  });

  it('advances through the four levels and into round 2 with tougher bricks', () => {
    const g = new Game({ rng: createRng(1) });
    g.newGame();
    const ids = [];
    for (let i = 0; i < 5; i++) {
      ids.push(g.levelDef.id);
      g.begin();
      g.bricks = [];
      g.completeLevel();
      g.advance();
    }
    expect(ids).toEqual(['bendera', 'kilimanjaro', 'zanzibar', 'serengeti', 'bendera']);
    expect(g.level).toBe(6);
    expect(g.round).toBe(2);
    const green = g.bricks.find((b) => b.letter === 'g');
    const wood = new Game();
    wood.level = 7;
    wood.loadLevel();
    expect(green.hp).toBe(2);
    expect(wood.bricks.find((b) => b.letter === 'd').hp).toBe(3);
  });

  it('doubles points per hit in round 2', () => {
    const { game } = playingGame({ rows: ['.....g.....g'], level: 5 });
    expect(game.round).toBe(2);
    const brick = game.bricks[0];
    expect(brick.hp).toBe(2);
    setBall(game, brick.x + 18, brick.y + 16 + R + 2, 0, -5);
    game.step();
    expect(game.score).toBe(20);
  });

  it('keeps the score and lives when moving to the next level', () => {
    const { game } = playingGame({ rows: ['.....g......'] });
    game.lives = 2;
    game.score = 500;
    game.completeLevel();
    game.advance();
    expect(game.lives).toBe(2);
    expect(game.score).toBe(750);
    expect(game.state).toBe(STATES.READY);
    expect(game.balls[0].stuck).toBe(true);
  });
});

describe('lives', () => {
  function dropBall(game) {
    setBall(game, 240, RULES.field.height + 50, 0, 5);
    game.step();
  }

  it('starts with 3 and loses one when the last ball falls', () => {
    const { game, events } = playingGame({ rows: ONE_CORNER_BRICK });
    expect(game.lives).toBe(3);
    dropBall(game);
    expect(game.lives).toBe(2);
    expect(game.balls[0].stuck).toBe(true);
    expect(types(events)).toContain('lifeLost');
  });

  it('ends the game at zero lives', () => {
    const { game, events } = playingGame({ rows: ONE_CORNER_BRICK });
    dropBall(game);
    dropBall(game);
    dropBall(game);
    expect(game.lives).toBe(0);
    expect(game.state).toBe(STATES.GAME_OVER);
    expect(types(events)).toContain('gameOver');
  });

  it('restarts cleanly from game over', () => {
    const { game } = playingGame({ rows: ONE_CORNER_BRICK });
    game.score = 900;
    for (let i = 0; i < 3; i++) dropBall(game);
    game.newGame();
    expect(game.state).toBe(STATES.READY);
    expect(game.score).toBe(0);
    expect(game.lives).toBe(3);
    expect(game.level).toBe(1);
  });

  it('losing one ball during multi-ball costs nothing', () => {
    const { game } = playingGame({ rows: ONE_CORNER_BRICK });
    setBall(game, 240, 300, 0, -5);
    game.applyPowerUp('multi');
    expect(game.balls).toHaveLength(3);
    game.balls[0].y = RULES.field.height + 50;
    game.step();
    expect(game.balls).toHaveLength(2);
    expect(game.lives).toBe(3);
  });

  it('losing the last of several balls costs one life and clears effects', () => {
    const { game } = playingGame({ rows: ONE_CORNER_BRICK });
    setBall(game, 240, 300, 0, -5);
    game.applyPowerUp('multi');
    game.applyPowerUp('wide');
    game.drops.push({ x: 100, y: 200, kind: 'life' });
    for (const b of game.balls) b.y = RULES.field.height + 50;
    game.step();
    expect(game.lives).toBe(2);
    expect(game.paddle.w).toBe(84);
    expect(game.drops).toHaveLength(0);
  });
});

describe('power-ups', () => {
  it('maps rolls to the documented shares', () => {
    const w = RULES.powerUps.weights;
    expect(pickPowerUp(0, w)).toBe('wide');
    expect(pickPowerUp(0.4499, w)).toBe('wide');
    expect(pickPowerUp(0.45, w)).toBe('multi');
    expect(pickPowerUp(0.8899, w)).toBe('multi');
    expect(pickPowerUp(0.89, w)).toBe('life');
    expect(pickPowerUp(0.99999, w)).toBe('life');
  });

  it('drops about 12% of the time with 45/44/11 shares over many breaks', () => {
    const { game } = playingGame({ rows: ONE_CORNER_BRICK, rng: createRng(7) });
    const counts = { wide: 0, multi: 0, life: 0 };
    const N = 200000;
    let drops = 0;
    for (let i = 0; i < N; i++) {
      game.drops = [];
      game.maybeDropPowerUp({ x: 0, y: 0, w: 36, h: 16 });
      if (game.drops.length) {
        drops++;
        counts[game.drops[0].kind]++;
      }
    }
    expect(drops / N).toBeCloseTo(0.12, 2);
    expect(counts.wide / drops).toBeCloseTo(0.45, 1);
    expect(counts.multi / drops).toBeCloseTo(0.44, 1);
    expect(counts.life / drops).toBeCloseTo(0.11, 1);
  });

  it('falls at 2.4 units per step and is caught by the paddle for 50 points', () => {
    const { game, events } = playingGame({ rows: ONE_CORNER_BRICK });
    setBall(game, 240, 300, 0, -1);
    game.paddle.x = game.paddle.target = 240;
    game.drops.push({ x: 240, y: 400, kind: 'life' });
    game.step();
    expect(game.drops[0].y).toBeCloseTo(402.4, 6);
    stepUntil(game, () => game.drops.length === 0);
    expect(game.score).toBe(50);
    expect(types(events)).toContain('powerUp');
  });

  it('a missed power-up disappears off the bottom', () => {
    const { game } = playingGame({ rows: ONE_CORNER_BRICK });
    setBall(game, 240, 300, 0, -1);
    game.paddle.x = game.paddle.target = 50;
    game.drops.push({ x: 400, y: 560, kind: 'wide' });
    stepUntil(game, () => game.drops.length === 0);
    expect(game.score).toBe(0);
  });

  it('wide paddle grows to 130 for exactly 12 seconds', () => {
    const { game, events } = playingGame({ rows: ONE_CORNER_BRICK });
    setBall(game, 240, 300, 0, 0.0001);
    game.balls[0].vy = 0;
    game.applyPowerUp('wide');
    expect(game.paddle.w).toBe(130);
    for (let i = 0; i < 12 * 60 - 1; i++) game.step();
    expect(game.paddle.w).toBe(130);
    game.step();
    expect(game.paddle.w).toBe(84);
    expect(types(events)).toContain('wideEnded');
  });

  it('extra life stops at 6', () => {
    const { game } = playingGame({ rows: ONE_CORNER_BRICK });
    for (let i = 0; i < 10; i++) game.applyPowerUp('life');
    expect(game.lives).toBe(6);
    expect(game.score).toBe(500);
  });

  it('multi-ball adds two balls about 30° to each side at the level speed', () => {
    const { game } = playingGame({ rows: ONE_CORNER_BRICK });
    setBall(game, 240, 300, 0, -5);
    game.applyPowerUp('multi');
    const [, l, r] = game.balls;
    expect(angleFromVertical(l.vx, l.vy)).toBeCloseTo(30, 5);
    expect(angleFromVertical(r.vx, r.vy)).toBeCloseTo(30, 5);
    expect(Math.sign(l.vx)).not.toBe(Math.sign(r.vx));
    for (const b of game.balls) expect(Math.hypot(b.vx, b.vy)).toBeCloseTo(5, 6);
  });

  it('multi-ball from an already steep ball never goes flatter than the limit', () => {
    const { game } = playingGame({ rows: ONE_CORNER_BRICK });
    const s = ballSpeed(1);
    setBall(game, 240, 300, Math.sin(Math.PI / 3) * s, -Math.cos(Math.PI / 3) * s);
    game.applyPowerUp('multi');
    for (const b of game.balls) {
      expect(angleFromVertical(b.vx, b.vy)).toBeLessThanOrEqual(RULES.ball.maxAngleFromVerticalDeg + 1e-6);
    }
  });

  it('multi-ball while the ball rests on the paddle launches all three', () => {
    const { game } = playingGame({ rows: ONE_CORNER_BRICK });
    game.applyPowerUp('multi');
    expect(game.balls).toHaveLength(3);
    expect(game.balls.every((b) => !b.stuck && b.vy < 0)).toBe(true);
  });
});

describe('long-run stability', () => {
  it('plays 20 minutes of automated rallies without leaving the field or stalling', () => {
    const g = new Game({ rng: createRng(123) });
    g.newGame();
    g.begin();
    let levels = 0;
    const bad = [];
    for (let i = 0; i < 60 * 60 * 20; i++) {
      // Autopilot: keep the paddle under the lowest falling ball.
      const falling = g.balls.filter((b) => b.vy > 0).sort((a, b) => b.y - a.y)[0];
      if (falling) g.setPaddleTarget(falling.x + 10);
      if (g.state === STATES.PLAYING) {
        g.launch();
        g.step();
      } else if (g.state === STATES.LEVEL_COMPLETE) {
        levels++;
        g.advance();
        g.begin();
      } else if (g.state === STATES.GAME_OVER) {
        g.newGame();
        g.begin();
      }
      for (const b of g.balls) {
        const ok =
          b.x >= b.r - 1e-6 &&
          b.x <= RULES.field.width - b.r + 1e-6 &&
          Number.isFinite(b.vx) &&
          Number.isFinite(b.vy) &&
          (b.stuck || Math.abs(b.vy) > 0.5);
        if (!ok) bad.push({ step: i, ball: { ...b } });
      }
    }
    expect(bad.slice(0, 3)).toEqual([]);
    expect(levels).toBeGreaterThan(0);
  }, 60000);
});
