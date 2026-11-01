// Connects the game, renderer, sound, storage and platform to the screens.

import { Game, STATES } from '../engine/game.js';
import { createRng } from '../engine/rng.js';
import { RULES } from '../config/rules.js';
import { LEVELS, validateLevel } from '../config/levels.js';
import { Renderer, drawLevelPreview, drawPaddleShape, drawBall } from '../render/renderer.js';
import { PADDLES, BALLS, paddleById, ballById, isUnlocked, unlockProgress, unlockedKeys } from '../config/skins.js';
import { Sfx } from '../audio/sfx.js';
import { SaveData } from '../storage/storage.js';
import { applyTranslations, translate, translatePlain, lookup } from '../i18n/i18n.js';
import { fitField } from './layout.js';

const STEP_MS = 1000 / RULES.stepsPerSecond;
const MAX_STEPS_PER_FRAME = 5;
export const SPLASH_MS = 1000;
const LEVEL_CLEAR_PAUSE_MS = 1100;
const UNLOCK_NOTE_MS = 2600;

const EVENT_SOUNDS = {
  wall: 'wall',
  paddle: 'paddle',
  brickCrack: 'crack',
  brickBreak: 'break',
  powerUp: 'powerUp',
  lifeLost: 'lifeLost',
  levelComplete: 'levelClear',
  launch: 'launch',
};

export class App {
  constructor({ root = document, storageBackend, platform, version = '1.0.0', seed, reducedMotion = false }) {
    this.root = root;
    this.$ = (id) => root.getElementById(id);
    this.platform = platform;
    this.version = version;
    this.save = new SaveData(storageBackend);
    this.sfx = new Sfx();
    this.screen = 'splash';
    this.overlay = null; // 'card' | 'pause' | 'over' | null
    this.lastFrame = 0;
    this.acc = 0;
    this.timers = new Set();
    this.pendingBricks = 0; // bricks broken since the stats were last saved
    this.lostLifeThisLevel = false;
    this.knownUnlocks = new Set();
    for (const l of LEVELS) validateLevel(l, RULES);
    this.game = new Game({ rules: RULES, levels: LEVELS, rng: createRng(seed ?? Date.now()), onEvent: (e) => this.onGameEvent(e) });
    this.renderer = new Renderer(this.$('game-canvas'), RULES, { reducedMotion });
  }

  async start() {
    const shownAt = performance.now();
    await this.save.load();
    this.knownUnlocks = unlockedKeys(this.save.progress);
    this.applySettings();
    this.bindUi();
    this.onResize();
    globalThis.addEventListener('resize', () => this.onResize());
    const wait = Math.max(0, SPLASH_MS - (performance.now() - shownAt));
    await new Promise((r) => setTimeout(r, wait));
    this.showScreen('home');
    requestAnimationFrame((t) => this.frame(t));
  }

  // ---- Screens -------------------------------------------------------------

  showScreen(name) {
    for (const id of ['splash', 'home', 'game', 'style', 'settings', 'howto', 'privacy']) {
      this.$(`screen-${id}`).hidden = id !== name;
    }
    this.screen = name;
    if (name === 'home') this.refreshHome();
    if (name === 'style') this.renderStyle();
    if (name === 'game') this.onResize();
    const focusTarget = this.$(`screen-${name}`).querySelector('.btn-primary, [data-back]');
    focusTarget?.focus({ preventScroll: true });
  }

  showOverlay(name) {
    for (const id of ['card', 'pause', 'over']) this.$(`overlay-${id}`).hidden = id !== name;
    this.overlay = name;
    if (name) this.$(`overlay-${name}`).querySelector('.btn-primary')?.focus({ preventScroll: true });
    this.updateLaunchHint();
  }

  refreshHome() {
    this.$('home-best').textContent = this.save.best;
    this.$('home-reached').textContent = this.save.highestLevel;
    const preview = new Game({ rules: RULES, levels: LEVELS, rng: createRng(1) });
    preview.loadLevel();
    drawLevelPreview(this.$('preview'), preview.bricks, RULES);
  }

  // ---- Settings and language ----------------------------------------------

  get lang() {
    return this.save.settings.language;
  }

  applySettings() {
    const s = this.save.settings;
    this.sfx.enabled = s.sound;
    const progress = this.save.progress;
    const paddle = paddleById(s.paddle);
    const ball = ballById(s.ball);
    this.renderer.skin = {
      paddle: isUnlocked(paddle, progress) ? paddle : PADDLES[0],
      ball: isUnlocked(ball, progress) ? ball : BALLS[0],
    };
    applyTranslations(this.root, s.language, (key) => (key === 'settings.version' ? { v: this.version } : {}));
    this.$('set-sound').setAttribute('aria-checked', String(s.sound));
    this.$('set-vibration').setAttribute('aria-checked', String(s.vibration));
    for (const c of this.root.querySelectorAll('.choice')) c.setAttribute('aria-checked', String(c.dataset.lang === s.language));
    this.$('version').textContent = translatePlain(s.language, 'settings.version', { v: this.version });
    const soundBtn = this.$('btn-pause-sound');
    setStacked(soundBtn, translate(s.language, s.sound ? 'pause.soundOn' : 'pause.soundOff'));
    soundBtn.setAttribute('aria-checked', String(s.sound));
    if (this.overlay === 'card') this.fillLevelCard();
    if (this.screen === 'style') this.renderStyle();
  }

  // ---- Style: unlockable paddles and balls ---------------------------------

  renderStyle() {
    const mode = this.lang;
    const progress = this.save.progress;
    const fill = (kind, items, selected, draw) => {
      const box = this.$(`skins-${kind}`);
      box.textContent = '';
      for (const item of items) {
        const p = unlockProgress(item.unlock, progress);
        const btn = document.createElement('button');
        btn.className = 'skin';
        btn.type = 'button';
        btn.setAttribute('role', 'radio');
        btn.dataset.kind = kind;
        btn.dataset.id = item.id;
        btn.setAttribute('aria-checked', String(item.id === selected));
        btn.setAttribute('aria-disabled', String(!p.done));
        const canvas = document.createElement('canvas');
        canvas.width = 192;
        canvas.height = 96;
        canvas.setAttribute('aria-hidden', 'true');
        draw(canvas.getContext('2d'), item);
        const name = document.createElement('span');
        name.className = 'skin-name';
        name.textContent = translatePlain(mode, item.nameKey);
        btn.append(canvas, name);
        const label = [name.textContent];
        if (p.done && item.id === selected) {
          const note = document.createElement('span');
          note.className = 'skin-need';
          note.textContent = translatePlain(mode, 'style.inUse');
          btn.append(note);
        } else if (!p.done) {
          const need = translatePlain(mode, `style.locked.${item.unlock.kind}`, { n: p.need.toLocaleString() });
          const note = document.createElement('span');
          note.className = 'skin-need';
          note.textContent = need;
          const bar = document.createElement('span');
          bar.className = 'skin-bar';
          const fillEl = document.createElement('span');
          fillEl.style.width = `${Math.round((100 * p.have) / p.need)}%`;
          bar.append(fillEl);
          btn.append(note, bar);
          label.push(need, `${p.have}/${p.need}`);
        }
        btn.setAttribute('aria-label', label.join('. '));
        btn.addEventListener('click', () => {
          if (!p.done) return;
          this.sfx.unlock();
          this.setSetting({ [kind]: item.id });
        });
        box.append(btn);
      }
    };
    fill('paddle', PADDLES, this.renderer.skin.paddle.id, (ctx, item) => {
      drawPaddleShape(ctx, 16, 38, 160, 22, item.stops);
    });
    fill('ball', BALLS, this.renderer.skin.ball.id, (ctx, item) => {
      drawBall(ctx, { x: 96, y: 48, r: 26 }, item);
    });
  }

  /** Saves the bricks broken so far and anything else in `extra`, then announces new unlocks. */
  async saveStats(extra = {}) {
    const delta = { bricks: this.pendingBricks, ...extra };
    this.pendingBricks = 0;
    if (Object.values(delta).some((v) => v > 0)) await this.save.addStats(delta);
    this.checkUnlocks();
  }

  checkUnlocks() {
    const now = unlockedKeys(this.save.progress);
    const fresh = [...now].filter((k) => !this.knownUnlocks.has(k));
    this.knownUnlocks = now;
    if (!fresh.length) return;
    const items = fresh.map((k) => {
      const [kind, id] = k.split(':');
      return kind === 'paddle' ? paddleById(id) : ballById(id);
    });
    // Each language gets the item names in that language.
    const say = (lang) => lookup(lang, 'style.unlocked', { name: items.map((i) => lookup(lang, i.nameKey)).join(', ') });
    const note = this.$('unlock-note');
    note.textContent = this.lang === 'both' ? `${say('sw')} · ${say('en')}` : say(this.lang);
    note.hidden = false;
    this.later(() => (note.hidden = true), UNLOCK_NOTE_MS);
  }

  async setSetting(patch) {
    await this.save.updateSettings(patch);
    this.applySettings();
  }

  // ---- UI wiring -----------------------------------------------------------

  bindUi() {
    const on = (id, fn) => this.$(id).addEventListener('click', (e) => {
      this.sfx.unlock();
      fn(e);
    });
    on('btn-play', () => this.newGame());
    on('btn-style', () => this.showScreen('style'));
    on('btn-settings', () => this.showScreen('settings'));
    on('btn-howto', () => this.showScreen('howto'));
    on('btn-privacy', () => this.showScreen('privacy'));
    on('btn-go', () => this.beginLevel());
    on('btn-pause', () => this.pause());
    on('btn-resume', () => this.resume());
    on('btn-quit', () => this.quitToHome());
    on('btn-again', () => this.newGame());
    on('btn-over-home', () => this.quitToHome());
    on('btn-pause-sound', () => this.setSetting({ sound: !this.save.settings.sound }));
    on('set-sound', () => this.setSetting({ sound: !this.save.settings.sound }));
    on('set-vibration', () => this.setSetting({ vibration: !this.save.settings.vibration }));
    for (const c of this.root.querySelectorAll('.choice')) {
      c.addEventListener('click', () => this.setSetting({ language: c.dataset.lang }));
    }
    for (const b of this.root.querySelectorAll('[data-back]')) b.addEventListener('click', () => this.handleBack());

    const stage = this.$('stage');
    const toField = (clientX) => {
      const r = this.$('game-canvas').getBoundingClientRect();
      return ((clientX - r.left) / r.width) * RULES.field.width;
    };
    stage.addEventListener('pointerdown', (e) => {
      if (this.overlay) return;
      this.sfx.unlock();
      stage.setPointerCapture?.(e.pointerId);
      this.game.setPaddleTarget(toField(e.clientX));
      if (this.game.launch()) this.updateLaunchHint();
    });
    stage.addEventListener('pointermove', (e) => {
      if (this.overlay) return;
      this.game.setPaddleTarget(toField(e.clientX));
    });
    // Keyboard support for desktop testing and accessibility.
    globalThis.addEventListener('keydown', (e) => {
      if (this.screen !== 'game' || this.overlay) return;
      if (e.key === ' ') {
        this.game.launch();
        this.updateLaunchHint();
        e.preventDefault();
      } else if (e.key === 'ArrowLeft') this.game.setPaddleTarget(this.game.paddle.x - 40);
      else if (e.key === 'ArrowRight') this.game.setPaddleTarget(this.game.paddle.x + 40);
      else if (e.key === 'p' || e.key === 'Escape') this.pause();
    });
  }

  onResize() {
    const stage = this.$('stage');
    if (this.$('screen-game').hidden) return;
    const box = stage.getBoundingClientRect();
    const border = 8; // the flag frame's padding on both sides
    const { width, height } = fitField(box.width - border, box.height - border, RULES.field.width, RULES.field.height);
    this.renderer.resize(width, height);
  }

  // ---- Game flow -----------------------------------------------------------

  newGame() {
    this.clearTimers();
    this.renderer.clearEffects();
    this.newBest = false;
    this.game.newGame();
    this.showScreen('game');
    this.updateHud();
    this.fillLevelCard();
    this.showOverlay('card');
    this.lostLifeThisLevel = false;
    this.pendingBricks = 0;
    this.saveStats({ games: 1 });
  }

  fillLevelCard() {
    const def = this.game.levelDef;
    const mode = this.lang;
    this.$('card-level').textContent = translatePlain(mode, 'card.level', { n: this.game.level });
    setStacked(this.$('card-name'), translate(mode, def.nameKey));
    setStacked(this.$('card-subtitle'), translate(mode, def.subtitleKey));
  }

  beginLevel() {
    if (this.game.state !== STATES.READY) return;
    this.game.begin();
    this.save.recordLevel(this.game.level);
    this.showOverlay(null);
    this.lastFrame = 0;
  }

  pause() {
    if (!this.game.pause()) return false;
    this.showOverlay('pause');
    this.save.recordScore(this.game.score);
    return true;
  }

  resume() {
    if (!this.game.resume()) return;
    this.showOverlay(null);
    this.lastFrame = 0;
  }

  quitToHome() {
    this.clearTimers();
    this.saveStats();
    this.save.recordScore(this.game.score);
    this.game.quit();
    this.showOverlay(null);
    this.showScreen('home');
  }

  /** Android Back button. Returns true if it was handled inside the app. */
  handleBack() {
    switch (this.screen) {
      case 'style':
      case 'settings':
      case 'howto':
        this.showScreen('home');
        return true;
      case 'privacy':
        this.showScreen('settings');
        return true;
      case 'game':
        if (this.overlay === 'pause') this.resume();
        else if (this.overlay === 'card' || this.overlay === 'over') this.quitToHome();
        else if (this.game.state === STATES.PLAYING) this.pause();
        else if (this.game.state === STATES.LEVEL_COMPLETE) return true; // wait for the next card
        return true;
      case 'home':
        this.platform?.exitApp?.();
        return false;
      default:
        return true;
    }
  }

  onBackground() {
    this.pause();
    this.saveStats();
    this.save.recordScore(this.game.score);
    this.sfx.suspend();
  }

  onForeground() {
    this.lastFrame = 0;
    this.sfx.unlock();
  }

  onGameEvent(e) {
    const sound = EVENT_SOUNDS[e.type];
    if (sound) this.sfx.play(sound);
    this.renderer.addEffect(e);
    switch (e.type) {
      case 'brickBreak':
        this.pendingBricks++;
        break;
      case 'lifeLost':
        this.lostLifeThisLevel = true;
        if (this.save.settings.vibration) this.platform?.vibrate?.(120);
        break;
      case 'levelComplete': {
        this.save.recordScore(this.game.score);
        const flawless = this.lostLifeThisLevel ? 0 : 1;
        this.lostLifeThisLevel = false;
        this.toast(translatePlain(this.lang, 'card.cleared', { bonus: e.bonus }));
        this.later(() => {
          this.game.advance();
          this.save.recordLevel(this.game.level);
          this.saveStats({ flawless });
          this.renderer.clearEffects();
          this.fillLevelCard();
          this.showOverlay('card');
          this.updateHud();
        }, LEVEL_CLEAR_PAUSE_MS);
        break;
      }
      case 'gameOver':
        this.finishGame();
        break;
      default:
        break;
    }
    this.hudDirty = true;
  }

  async finishGame() {
    const isBest = await this.save.recordScore(this.game.score);
    await this.saveStats();
    this.$('over-score').textContent = this.game.score;
    this.$('over-best').hidden = !isBest;
    this.updateHud();
    this.showOverlay('over');
  }

  toast(text) {
    const t = this.$('toast');
    t.textContent = text;
    t.hidden = false;
    this.later(() => (t.hidden = true), LEVEL_CLEAR_PAUSE_MS);
  }

  later(fn, ms) {
    const id = setTimeout(() => {
      this.timers.delete(id);
      fn();
    }, ms);
    this.timers.add(id);
  }

  clearTimers() {
    for (const id of this.timers) clearTimeout(id);
    this.timers.clear();
    this.$('toast').hidden = true;
    this.$('unlock-note').hidden = true;
  }

  updateHud() {
    const g = this.game;
    this.$('hud-score').textContent = g.score;
    this.$('hud-best').textContent = Math.max(this.save.best, g.score);
    this.$('hud-level').textContent = g.level;
    this.$('hud-lives').textContent = g.lives;
    this.hudDirty = false;
  }

  updateLaunchHint() {
    const resting = this.game.state === STATES.PLAYING && this.game.balls.some((b) => b.stuck);
    this.$('launch-hint').hidden = !resting || !!this.overlay;
  }

  // ---- Main loop -----------------------------------------------------------

  frame(t) {
    requestAnimationFrame((n) => this.frame(n));
    if (this.screen !== 'game') {
      this.lastFrame = 0;
      return;
    }
    if (this.game.state === STATES.PLAYING) {
      const dt = this.lastFrame ? Math.min(t - this.lastFrame, 100) : STEP_MS;
      this.acc += dt;
      let n = 0;
      while (this.acc >= STEP_MS && n < MAX_STEPS_PER_FRAME) {
        const wasResting = this.game.balls.some((b) => b.stuck);
        this.game.step();
        this.renderer.stepEffects();
        if (wasResting !== this.game.balls.some((b) => b.stuck)) this.updateLaunchHint();
        this.acc -= STEP_MS;
        n++;
        if (this.game.state !== STATES.PLAYING) break;
      }
      if (n === MAX_STEPS_PER_FRAME) this.acc = 0; // device too slow: drop time rather than spiral
    } else {
      this.acc = 0;
    }
    this.lastFrame = t;
    if (this.hudDirty) this.updateHud();
    this.renderer.draw(this.game, t);
  }
}

function setStacked(el, { primary, secondary }) {
  el.textContent = '';
  const p = document.createElement('span');
  p.className = 't-pri';
  p.textContent = primary;
  el.append(p);
  if (secondary) {
    const s = document.createElement('span');
    s.className = 't-sec';
    s.textContent = secondary;
    el.append(s);
  }
}
