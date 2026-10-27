// Saved data: best score, highest level and settings. Values are validated on
// load, so corrupt or missing data falls back to defaults instead of crashing.

import { LANGUAGE_MODES, DEFAULT_LANGUAGE } from '../i18n/i18n.js';

export const KEYS = Object.freeze({
  best: 'matofali.best',
  highestLevel: 'matofali.highestLevel',
  settings: 'matofali.settings',
});

export const DEFAULT_SETTINGS = Object.freeze({ sound: true, vibration: true, language: DEFAULT_LANGUAGE });

/** Backend over window.localStorage, used in the browser and in tests. */
export function localStorageBackend(store = globalThis.localStorage) {
  return {
    async get(key) {
      try {
        return store.getItem(key);
      } catch {
        return null;
      }
    },
    async set(key, value) {
      try {
        store.setItem(key, value);
      } catch {
        /* storage full or blocked: keep playing */
      }
    },
  };
}

/** Backend over Capacitor Preferences, used in the Android app. */
export function preferencesBackend(Preferences) {
  return {
    async get(key) {
      try {
        return (await Preferences.get({ key })).value;
      } catch {
        return null;
      }
    },
    async set(key, value) {
      try {
        await Preferences.set({ key, value });
      } catch {
        /* ignore */
      }
    },
  };
}

/** In-memory backend for tests. */
export function memoryBackend(initial = {}) {
  const map = new Map(Object.entries(initial));
  return {
    map,
    async get(key) {
      return map.has(key) ? map.get(key) : null;
    },
    async set(key, value) {
      map.set(key, value);
    },
  };
}

function nonNegativeInt(raw, fallback) {
  const n = Number(raw);
  return Number.isInteger(n) && n >= 0 && n < 1e12 ? n : fallback;
}

export function parseSettings(raw) {
  let obj;
  try {
    obj = JSON.parse(raw);
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
  if (!obj || typeof obj !== 'object') return { ...DEFAULT_SETTINGS };
  return {
    sound: typeof obj.sound === 'boolean' ? obj.sound : DEFAULT_SETTINGS.sound,
    vibration: typeof obj.vibration === 'boolean' ? obj.vibration : DEFAULT_SETTINGS.vibration,
    language: LANGUAGE_MODES.includes(obj.language) ? obj.language : DEFAULT_SETTINGS.language,
  };
}

export class SaveData {
  constructor(backend) {
    this.backend = backend;
    this.best = 0;
    this.highestLevel = 1;
    this.settings = { ...DEFAULT_SETTINGS };
  }

  async load() {
    const [best, highest, settings] = await Promise.all([
      this.backend.get(KEYS.best),
      this.backend.get(KEYS.highestLevel),
      this.backend.get(KEYS.settings),
    ]);
    this.best = nonNegativeInt(best, 0);
    this.highestLevel = Math.max(1, nonNegativeInt(highest, 1));
    this.settings = settings == null ? { ...DEFAULT_SETTINGS } : parseSettings(settings);
    return this;
  }

  /** Saves the score if it beats the best. Returns true for a new best. */
  async recordScore(score) {
    if (!(score > this.best)) return false;
    this.best = score;
    await this.backend.set(KEYS.best, String(score));
    return true;
  }

  async recordLevel(level) {
    if (!(level > this.highestLevel)) return;
    this.highestLevel = level;
    await this.backend.set(KEYS.highestLevel, String(level));
  }

  async updateSettings(patch) {
    this.settings = parseSettings(JSON.stringify({ ...this.settings, ...patch }));
    await this.backend.set(KEYS.settings, JSON.stringify(this.settings));
    return this.settings;
  }
}
