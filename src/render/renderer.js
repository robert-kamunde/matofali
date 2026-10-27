// Draws a Game onto a canvas. Visual effects (particles, shake) live here,
// never in the game rules.

import { COLORS, BRICK_COLORS, POWER_UP_STYLE } from './palette.js';
import { createRng } from '../engine/rng.js';

const MAX_PARTICLES = 120;

export class Renderer {
  constructor(canvas, rules, { reducedMotion = false } = {}) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.rules = rules;
    this.W = rules.field.width;
    this.H = rules.field.height;
    this.reducedMotion = reducedMotion;
    this.particles = [];
    this.shake = 0;
    this.scale = 1;
    this.background = null;
    this.stars = makeStars(this.W, this.H);
  }

  /** Sizes the canvas to cssWidth × cssHeight at the device pixel ratio (capped at 2 for speed). */
  resize(cssWidth, cssHeight, dpr = globalThis.devicePixelRatio || 1) {
    const ratio = Math.min(dpr, 2);
    this.canvas.style.width = `${cssWidth}px`;
    this.canvas.style.height = `${cssHeight}px`;
    this.canvas.width = Math.round(cssWidth * ratio);
    this.canvas.height = Math.round(cssHeight * ratio);
    this.scale = this.canvas.width / this.W;
    this.background = null; // rebuild at the new size
  }

  /** Static sky and mountain, drawn once into an offscreen canvas. */
  buildBackground() {
    const c = document.createElement('canvas');
    c.width = this.canvas.width;
    c.height = this.canvas.height;
    const g = c.getContext('2d');
    g.scale(this.scale, this.scale);
    drawSky(g, this.W, this.H, this.stars);
    this.background = c;
  }

  addEffect(event) {
    if (this.reducedMotion) return;
    if (event.type === 'brickBreak') {
      const b = event.brick;
      const color = BRICK_COLORS[b.kind];
      const rng = Math.random;
      for (let i = 0; i < 8 && this.particles.length < MAX_PARTICLES; i++) {
        this.particles.push({
          x: b.x + b.w / 2,
          y: b.y + b.h / 2,
          vx: (rng() - 0.5) * 5,
          vy: (rng() - 0.5) * 5 - 1,
          life: 30,
          color,
        });
      }
    } else if (event.type === 'lifeLost') {
      this.shake = 10;
    }
  }

  /** Advances effects by one step; called alongside game steps. */
  stepEffects() {
    for (const p of this.particles) {
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.15;
      p.life--;
    }
    this.particles = this.particles.filter((p) => p.life > 0);
    if (this.shake > 0) {
      this.shake *= 0.85;
      if (this.shake < 0.5) this.shake = 0;
    }
  }

  clearEffects() {
    this.particles = [];
    this.shake = 0;
  }

  draw(game, time = 0) {
    const ctx = this.ctx;
    if (!this.background) this.buildBackground();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.drawImage(this.background, 0, 0);
    ctx.setTransform(this.scale, 0, 0, this.scale, 0, 0);
    if (this.shake > 0) ctx.translate((Math.random() - 0.5) * this.shake, (Math.random() - 0.5) * this.shake);
    if (!this.reducedMotion) twinkle(ctx, this.stars, time);

    for (const br of game.bricks) drawBrick(ctx, br);
    this.drawDrops(game.drops);
    this.drawPaddle(game.paddle);
    for (const b of game.balls) drawBall(ctx, b);
    for (const p of this.particles) {
      ctx.globalAlpha = p.life / 30;
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x, p.y, 4, 4);
    }
    ctx.globalAlpha = 1;
  }

  drawDrops(drops) {
    const ctx = this.ctx;
    const r = this.rules.powerUps.radius;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = '700 11px Outfit, system-ui, sans-serif';
    for (const d of drops) {
      const s = POWER_UP_STYLE[d.kind];
      ctx.fillStyle = s.fill;
      ctx.beginPath();
      ctx.arc(d.x, d.y, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = d.kind === 'life' ? '#000' : '#fff';
      ctx.fillText(s.glyph, d.x, d.y + 1);
    }
  }

  drawPaddle(p) {
    drawPaddleShape(this.ctx, p.x - p.w / 2, this.rules.paddle.y, p.w, this.rules.paddle.height);
  }
}

export function drawPaddleShape(ctx, x, y, w, h) {
  const g = ctx.createLinearGradient(x, 0, x + w, 0);
  const stops = [
    [0, COLORS.green], [0.42, COLORS.green], [0.42, COLORS.yellow], [0.46, COLORS.yellow],
    [0.46, '#000'], [0.54, '#000'], [0.54, COLORS.yellow], [0.58, COLORS.yellow],
    [0.58, COLORS.blue], [1, COLORS.blue],
  ];
  for (const [o, c] of stops) g.addColorStop(o, c);
  roundRect(ctx, x, y, w, h, h / 2);
  ctx.fillStyle = g;
  ctx.fill();
}

function drawBall(ctx, b) {
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = COLORS.yellow;
  ctx.beginPath();
  ctx.arc(b.x - 2, b.y - 2, 2.5, 0, Math.PI * 2);
  ctx.fill();
}

export function drawBrick(ctx, br) {
  roundRect(ctx, br.x, br.y, br.w, br.h, 3);
  ctx.fillStyle = BRICK_COLORS[br.kind];
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.18)';
  ctx.fillRect(br.x + 2, br.y + 2, br.w - 4, 3);
  if (br.kind === 'black') {
    ctx.strokeStyle = COLORS.yellow;
    ctx.lineWidth = 1;
    roundRect(ctx, br.x + 0.5, br.y + 0.5, br.w - 1, br.h - 1, 3);
    ctx.stroke();
  } else if (br.kind === 'wood') {
    ctx.strokeStyle = 'rgba(0,0,0,0.3)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(br.x + 4, br.y + br.h / 2);
    ctx.lineTo(br.x + br.w - 4, br.y + br.h / 2);
    ctx.stroke();
  }
  const damage = br.maxHp - br.hp;
  if (damage > 0) {
    ctx.strokeStyle = br.kind === 'black' ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.6)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(br.x + 7, br.y + 3);
    ctx.lineTo(br.x + 15, br.y + 10);
    ctx.lineTo(br.x + 23, br.y + 6);
    ctx.lineTo(br.x + 30, br.y + 13);
    if (damage > 1) {
      ctx.moveTo(br.x + 15, br.y + 10);
      ctx.lineTo(br.x + 13, br.y + 15);
      ctx.moveTo(br.x + 23, br.y + 6);
      ctx.lineTo(br.x + 26, br.y + 2);
    }
    ctx.stroke();
  }
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  if (ctx.roundRect) ctx.roundRect(x, y, w, h, r);
  else ctx.rect(x, y, w, h);
}

function makeStars(W, H) {
  const rng = createRng(2024);
  return Array.from({ length: 60 }, () => ({ x: rng() * W, y: rng() * H * 0.6, r: rng() * 1.3 + 0.2, p: rng() * 6 }));
}

export function drawSky(g, W, H, stars) {
  const grad = g.createLinearGradient(0, 0, 0, H);
  grad.addColorStop(0, COLORS.skyTop);
  grad.addColorStop(1, COLORS.skyBottom);
  g.fillStyle = grad;
  g.fillRect(0, 0, W, H);
  g.fillStyle = COLORS.star;
  for (const s of stars) {
    g.globalAlpha = 0.45;
    g.beginPath();
    g.arc(s.x, s.y, s.r, 0, Math.PI * 2);
    g.fill();
  }
  g.globalAlpha = 1;
  // Kilimanjaro silhouette with Kibo's flat summit.
  g.fillStyle = COLORS.mountain;
  g.beginPath();
  g.moveTo(0, H - 90);
  g.lineTo(150, H - 190);
  g.lineTo(205, H - 205);
  g.lineTo(265, H - 200);
  g.lineTo(340, H - 150);
  g.lineTo(W, H - 100);
  g.lineTo(W, H);
  g.lineTo(0, H);
  g.fill();
  g.fillStyle = COLORS.mountainSnow;
  g.beginPath();
  g.moveTo(170, H - 178);
  g.lineTo(205, H - 205);
  g.lineTo(265, H - 200);
  g.lineTo(292, H - 182);
  g.lineTo(260, H - 186);
  g.lineTo(235, H - 178);
  g.lineTo(205, H - 188);
  g.fill();
}

function twinkle(ctx, stars, time) {
  ctx.fillStyle = COLORS.star;
  for (let i = 0; i < stars.length; i += 4) {
    const s = stars[i];
    ctx.globalAlpha = 0.25 + 0.3 * Math.sin(time / 700 + s.p);
    ctx.beginPath();
    ctx.arc(s.x, s.y, s.r + 0.3, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

/** Small picture of a level for the home screen. */
export function drawLevelPreview(canvas, bricks, rules) {
  const ctx = canvas.getContext('2d');
  const s = canvas.width / rules.field.width;
  ctx.setTransform(s, 0, 0, s, 0, 0);
  const top = rules.grid.top - 20;
  ctx.translate(0, -top);
  drawSky(ctx, rules.field.width, rules.field.height, makeStars(rules.field.width, rules.field.height));
  for (const br of bricks) drawBrick(ctx, br);
}
