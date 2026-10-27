// Short retro sound effects synthesised with Web Audio: no sound files to
// license, nothing to download, a few bytes of code.

export const SOUNDS = Object.freeze({
  wall: { freq: 220, dur: 0.035, type: 'square', vol: 0.035 },
  paddle: { freq: 165, dur: 0.06, type: 'triangle', vol: 0.09 },
  crack: { freq: 300, dur: 0.05, type: 'square', vol: 0.05 },
  break: { freq: 560, dur: 0.07, type: 'square', vol: 0.05, slide: 1.25 },
  powerUp: { freq: 660, dur: 0.16, type: 'sine', vol: 0.09, slide: 2 },
  lifeLost: { freq: 196, dur: 0.38, type: 'sawtooth', vol: 0.06, slide: 0.5 },
  levelClear: { freq: 523, dur: 0.28, type: 'triangle', vol: 0.09, slide: 1.5 },
  launch: { freq: 392, dur: 0.05, type: 'triangle', vol: 0.06 },
});

export class Sfx {
  constructor() {
    this.enabled = true;
    this.ctx = null;
  }

  /** Must be called from a user gesture; browsers block audio before one. */
  unlock() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') this.ctx.resume().catch(() => {});
      return;
    }
    const AC = globalThis.AudioContext || globalThis.webkitAudioContext;
    if (!AC) return;
    try {
      this.ctx = new AC();
    } catch {
      this.ctx = null;
    }
  }

  suspend() {
    this.ctx?.suspend?.().catch(() => {});
  }

  play(name) {
    if (!this.enabled || !this.ctx || this.ctx.state !== 'running') return;
    const s = SOUNDS[name];
    if (!s) return;
    try {
      const t = this.ctx.currentTime;
      const o = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      o.type = s.type;
      o.frequency.setValueAtTime(s.freq, t);
      if (s.slide) o.frequency.exponentialRampToValueAtTime(s.freq * s.slide, t + s.dur);
      g.gain.setValueAtTime(s.vol, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + s.dur);
      o.connect(g);
      g.connect(this.ctx.destination);
      o.start(t);
      o.stop(t + s.dur + 0.02);
    } catch {
      /* never let sound break the game */
    }
  }
}
