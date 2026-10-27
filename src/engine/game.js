// The game itself: state, rules and simulation. No DOM, canvas or audio here,
// so every rule can be tested in Node. The UI reads public fields and listens to events.

import { RULES, roundForLevel, ballSpeed, brickHits, brickHitPoints } from '../config/rules.js';
import { LEVELS, levelDefinition } from '../config/levels.js';
import { createRng } from './rng.js';
import { clamp, velocityFromVertical, limitAngle, rotate, circleRectHit } from './physics.js';

export const STATES = Object.freeze({
  IDLE: 'idle', // no game running (home screen)
  READY: 'ready', // level loaded, level card showing
  PLAYING: 'playing',
  PAUSED: 'paused',
  LEVEL_COMPLETE: 'levelComplete', // board cleared, waiting for advance()
  GAME_OVER: 'gameOver',
});

const ALLOWED = Object.freeze({
  idle: ['ready'],
  ready: ['playing', 'idle'],
  playing: ['paused', 'levelComplete', 'gameOver', 'idle'],
  paused: ['playing', 'idle'],
  levelComplete: ['ready', 'idle'],
  gameOver: ['ready', 'idle'],
});

export class Game {
  constructor({ rules = RULES, levels = LEVELS, rng = createRng(), onEvent = () => {} } = {}) {
    this.rules = rules;
    this.levels = levels;
    this.rng = rng;
    this.onEvent = onEvent;
    this.state = STATES.IDLE;
    this.score = 0;
    this.lives = rules.lives.start;
    this.level = 1;
    this.bricks = [];
    this.balls = [];
    this.drops = [];
    this.paddle = { x: rules.field.width / 2, target: rules.field.width / 2, w: rules.paddle.width, wideSteps: 0 };
    this.steps = 0;
  }

  get round() {
    return roundForLevel(this.level, this.rules);
  }

  get levelDef() {
    return levelDefinition(this.level, this.levels);
  }

  emit(type, data = {}) {
    this.onEvent({ type, ...data });
  }

  transition(to) {
    if (!ALLOWED[this.state].includes(to)) {
      throw new Error(`Invalid state change ${this.state} → ${to}`);
    }
    const from = this.state;
    this.state = to;
    this.emit('state', { from, to });
  }

  // ---- Lifecycle ----------------------------------------------------------

  /** Starts a new game at level 1 and shows the first level card. */
  newGame() {
    this.score = 0;
    this.lives = this.rules.lives.start;
    this.level = 1;
    this.paddle.w = this.rules.paddle.width;
    this.paddle.wideSteps = 0;
    this.paddle.x = this.paddle.target = this.rules.field.width / 2;
    this.loadLevel();
    if (this.state !== STATES.IDLE) this.state = STATES.IDLE;
    this.transition(STATES.READY);
  }

  /** Level card dismissed: play begins with the ball resting on the paddle. */
  begin() {
    this.transition(STATES.PLAYING);
  }

  pause() {
    if (this.state !== STATES.PLAYING) return false;
    this.transition(STATES.PAUSED);
    return true;
  }

  resume() {
    if (this.state !== STATES.PAUSED) return false;
    this.transition(STATES.PLAYING);
    return true;
  }

  quit() {
    if (this.state === STATES.IDLE) return;
    this.transition(STATES.IDLE);
  }

  /** After a cleared board: load the next level and show its card. */
  advance() {
    this.level++;
    this.loadLevel();
    this.transition(STATES.READY);
  }

  loadLevel() {
    const def = this.levelDef;
    const { cols, brickWidth, brickHeight, gap, top } = this.rules.grid;
    const left = (this.rules.field.width - (cols * brickWidth + (cols - 1) * gap)) / 2;
    const round = this.round;
    this.bricks = [];
    def.rows.forEach((row, r) => {
      for (let c = 0; c < cols; c++) {
        const ch = row[c];
        if (!ch || ch === '.') continue;
        const hp = brickHits(ch, round, this.rules);
        this.bricks.push({
          x: left + c * (brickWidth + gap),
          y: top + r * (brickHeight + gap),
          w: brickWidth,
          h: brickHeight,
          letter: ch,
          kind: this.rules.bricks[ch].kind,
          hp,
          maxHp: hp,
        });
      }
    });
    this.drops = [];
    this.serveBall();
  }

  serveBall() {
    const r = this.rules.ball.radius;
    this.balls = [{ x: this.paddle.x, y: this.rules.paddle.y - r - 1, r, vx: 0, vy: 0, stuck: true }];
  }

  // ---- Input --------------------------------------------------------------

  /** Finger or pointer x in field units. Only the horizontal position matters. */
  setPaddleTarget(x) {
    this.paddle.target = x;
  }

  /** Launches any ball resting on the paddle. Returns true if one launched. */
  launch() {
    if (this.state !== STATES.PLAYING) return false;
    let launched = false;
    const speed = ballSpeed(this.level, this.rules);
    const spread = this.rules.ball.launchSpreadDeg;
    for (const b of this.balls) {
      if (!b.stuck) continue;
      const angle = (this.rng() * 2 - 1) * spread;
      Object.assign(b, velocityFromVertical(speed, angle), { stuck: false });
      launched = true;
    }
    if (launched) this.emit('launch');
    return launched;
  }

  // ---- Simulation ---------------------------------------------------------

  /** Advances the game by one fixed step (1/60 s). Does nothing unless playing. */
  step() {
    if (this.state !== STATES.PLAYING) return;
    this.steps++;
    this.movePaddle();
    this.moveBalls();
    if (this.state !== STATES.PLAYING) return;
    this.checkBallsLost();
    if (this.state !== STATES.PLAYING) return;
    this.moveDrops();
  }

  movePaddle() {
    const p = this.paddle;
    const W = this.rules.field.width;
    if (p.wideSteps > 0 && --p.wideSteps === 0) {
      p.w = this.rules.paddle.width;
      this.emit('wideEnded');
    }
    const target = clamp(p.target, p.w / 2, W - p.w / 2);
    p.x += (target - p.x) * this.rules.paddle.follow;
    if (Math.abs(target - p.x) < 0.01) p.x = target;
    p.x = clamp(p.x, p.w / 2, W - p.w / 2);
  }

  substepsFor(speed) {
    const b = this.rules.ball;
    return Math.max(b.minSubsteps, Math.ceil(speed / b.maxTravelPerSubstep));
  }

  moveBalls() {
    const { width: W } = this.rules.field;
    const padY = this.rules.paddle.y;
    for (const b of this.balls) {
      if (b.stuck) {
        b.x = this.paddle.x;
        b.y = padY - b.r - 1;
        continue;
      }
      const speed = Math.hypot(b.vx, b.vy);
      const n = this.substepsFor(speed);
      for (let s = 0; s < n; s++) {
        b.x += b.vx / n;
        b.y += b.vy / n;
        if (b.x < b.r) {
          b.x = b.r;
          b.vx = Math.abs(b.vx);
          this.emit('wall');
        } else if (b.x > W - b.r) {
          b.x = W - b.r;
          b.vx = -Math.abs(b.vx);
          this.emit('wall');
        }
        if (b.y < b.r) {
          b.y = b.r;
          b.vy = Math.abs(b.vy);
          this.emit('wall');
        }
        this.collidePaddle(b);
        this.collideBricks(b);
        if (this.state !== STATES.PLAYING) return;
      }
    }
  }

  collidePaddle(b) {
    if (b.vy <= 0) return;
    const p = this.paddle;
    const padY = this.rules.paddle.y;
    const ph = this.rules.paddle.height;
    const left = p.x - p.w / 2;
    if (!circleRectHit(b.x, b.y, b.r, left, padY, p.w, ph)) return;
    // Only bounce when the ball is above the paddle's middle; a ball already past it is lost.
    if (b.y > padY + ph / 2) return;
    const rel = clamp((b.x - p.x) / (p.w / 2), -1, 1);
    const speed = ballSpeed(this.level, this.rules);
    Object.assign(b, velocityFromVertical(speed, rel * this.rules.paddle.maxBounceAngleDeg));
    b.y = padY - b.r;
    this.emit('paddle', { rel });
  }

  collideBricks(b) {
    let flipX = false;
    let flipY = false;
    const hit = [];
    for (const br of this.bricks) {
      const res = circleRectHit(b.x, b.y, b.r, br.x, br.y, br.w, br.h);
      if (!res) continue;
      hit.push(br);
      const cx = br.x + br.w / 2;
      const cy = br.y + br.h / 2;
      const towardX = (b.x < cx && b.vx > 0) || (b.x > cx && b.vx < 0);
      const towardY = (b.y < cy && b.vy > 0) || (b.y > cy && b.vy < 0);
      if (res.axis === 'x') flipX = flipX || towardX;
      else if (res.axis === 'y') flipY = flipY || towardY;
      else {
        flipX = flipX || towardX;
        flipY = flipY || towardY;
      }
    }
    if (hit.length === 0) return;
    // Two bricks side by side both report the same face: bounce once, damage both.
    if (flipX) b.vx = -b.vx;
    if (flipY) b.vy = -b.vy;
    const lim = limitAngle(b.vx, b.vy, Math.hypot(b.vx, b.vy), this.rules.ball.maxAngleFromVerticalDeg);
    b.vx = lim.vx;
    b.vy = lim.vy;
    for (const br of hit) this.damageBrick(br);
  }

  damageBrick(br) {
    br.hp--;
    const points = brickHitPoints(this.round, this.rules);
    this.score += points;
    if (br.hp > 0) {
      this.emit('brickCrack', { brick: br, points });
      return;
    }
    this.bricks.splice(this.bricks.indexOf(br), 1);
    this.emit('brickBreak', { brick: br, points });
    this.maybeDropPowerUp(br);
    if (this.bricks.length === 0) this.completeLevel();
  }

  maybeDropPowerUp(br) {
    const pu = this.rules.powerUps;
    if (this.rng() >= pu.dropChance) return;
    const kind = pickPowerUp(this.rng(), pu.weights);
    this.drops.push({ x: br.x + br.w / 2, y: br.y + br.h / 2, kind });
    this.emit('drop', { kind });
  }

  completeLevel() {
    this.score += this.rules.score.levelClear;
    this.drops = [];
    this.transition(STATES.LEVEL_COMPLETE);
    this.emit('levelComplete', { level: this.level, bonus: this.rules.score.levelClear });
  }

  checkBallsLost() {
    const limit = this.rules.field.height + this.rules.ballOutMargin;
    const before = this.balls.length;
    this.balls = this.balls.filter((b) => b.y - b.r <= limit);
    if (this.balls.length < before) this.emit('ballLost', { remaining: this.balls.length });
    if (this.balls.length > 0) return;
    this.lives--;
    this.paddle.w = this.rules.paddle.width;
    this.paddle.wideSteps = 0;
    this.drops = [];
    if (this.lives <= 0) {
      this.lives = 0;
      this.emit('lifeLost', { lives: 0 });
      this.transition(STATES.GAME_OVER);
      this.emit('gameOver', { score: this.score, level: this.level });
      return;
    }
    this.emit('lifeLost', { lives: this.lives });
    this.serveBall();
  }

  moveDrops() {
    const pu = this.rules.powerUps;
    const p = this.paddle;
    const padY = this.rules.paddle.y;
    const ph = this.rules.paddle.height;
    const kept = [];
    for (const d of this.drops) {
      d.y += pu.fallSpeed;
      if (circleRectHit(d.x, d.y, pu.radius, p.x - p.w / 2, padY, p.w, ph)) {
        this.applyPowerUp(d.kind);
      } else if (d.y - pu.radius <= this.rules.field.height) {
        kept.push(d);
      }
    }
    this.drops = kept;
  }

  applyPowerUp(kind) {
    const pu = this.rules.powerUps;
    this.score += this.rules.score.powerUp;
    if (kind === 'wide') {
      this.paddle.w = this.rules.paddle.wideWidth;
      this.paddle.wideSteps = pu.wideDurationSteps;
    } else if (kind === 'life') {
      this.lives = Math.min(this.lives + 1, this.rules.lives.max);
    } else if (kind === 'multi') {
      this.splitBalls();
    }
    this.emit('powerUp', { kind, points: this.rules.score.powerUp });
  }

  splitBalls() {
    const speed = ballSpeed(this.level, this.rules);
    const maxDeg = this.rules.ball.maxAngleFromVerticalDeg;
    const src = this.balls.find((b) => !b.stuck) || this.balls[0];
    if (!src) return;
    const base = src.stuck ? velocityFromVertical(speed, 0) : { vx: src.vx, vy: src.vy };
    if (src.stuck) Object.assign(src, base, { stuck: false });
    for (const deg of [-this.rules.powerUps.multiSplitDeg, this.rules.powerUps.multiSplitDeg]) {
      const v = rotate(base.vx, base.vy, deg);
      const lim = limitAngle(v.vx, v.vy, speed, maxDeg);
      this.balls.push({ x: src.x, y: src.y, r: src.r, vx: lim.vx, vy: lim.vy, stuck: false });
    }
  }
}

/** Maps a random number in [0, 1) to a power-up kind using the configured shares. */
export function pickPowerUp(roll, weights) {
  let acc = 0;
  const entries = Object.entries(weights);
  for (const [kind, w] of entries) {
    acc += w;
    if (roll < acc) return kind;
  }
  return entries[entries.length - 1][0];
}
