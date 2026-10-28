import { describe, it, expect } from 'vitest';
import sw from '../../src/i18n/sw.js';
import en from '../../src/i18n/en.js';
import { translate, translatePlain, lookup, LANGUAGE_MODES } from '../../src/i18n/i18n.js';
import { LEVELS } from '../../src/config/levels.js';
import { SaveData, memoryBackend, localStorageBackend, parseSettings, KEYS, DEFAULT_SETTINGS } from '../../src/storage/storage.js';
import { fitField } from '../../src/ui/layout.js';
import { readFileSync } from 'node:fs';

describe('translations', () => {
  it('Swahili and English have exactly the same keys', () => {
    expect(Object.keys(sw).sort()).toEqual(Object.keys(en).sort());
  });

  it('every key used in the HTML and code exists', () => {
    const html = readFileSync(new URL('../../index.html', import.meta.url), 'utf8');
    const app = readFileSync(new URL('../../src/ui/app.js', import.meta.url), 'utf8');
    const keys = new Set([
      ...[...html.matchAll(/data-i18n(?:-aria)?="([^"]+)"/g)].map((m) => m[1]),
      ...[...app.matchAll(/'((?:card|pause|over|settings|hud|home|howto|privacy|common)\.[a-zA-Z.]+)'/g)].map((m) => m[1]),
      ...LEVELS.flatMap((l) => [l.nameKey, l.subtitleKey]),
    ]);
    for (const k of keys) expect(sw[k], k).toBeTypeOf('string');
  });

  it('no string is empty', () => {
    for (const [k, v] of [...Object.entries(sw), ...Object.entries(en)]) expect(v.trim(), k).not.toBe('');
  });

  it('defaults to Swahili first with English beneath', () => {
    expect(translate('both', 'home.play')).toEqual({ primary: 'Anza', secondary: 'Play' });
  });

  it('switches to Swahili only and English only', () => {
    expect(translate('sw', 'home.play')).toEqual({ primary: 'Anza', secondary: null });
    expect(translate('en', 'home.play')).toEqual({ primary: 'Play', secondary: null });
  });

  it('shows one line when both languages read the same', () => {
    expect(translate('both', 'level.kilimanjaro.name').secondary).toBeNull();
  });

  it('fills in values', () => {
    expect(translatePlain('both', 'card.level', { n: 5 })).toBe('Ngazi 5 · Level 5');
    expect(translatePlain('en', 'card.cleared', { bonus: 250 })).toBe('Level cleared! +250');
  });

  it('throws on a missing key so mistakes are caught in tests', () => {
    expect(() => lookup('sw', 'nope.missing')).toThrow(/Missing translation/);
  });

  it('offers the three documented language modes', () => {
    expect(LANGUAGE_MODES).toEqual(['both', 'sw', 'en']);
  });
});

describe('saved data', () => {
  it('starts with defaults on a fresh install', async () => {
    const s = await new SaveData(memoryBackend()).load();
    expect(s.best).toBe(0);
    expect(s.highestLevel).toBe(1);
    expect(s.settings).toEqual({ sound: true, vibration: true, language: 'both' });
  });

  it('keeps the best score across restarts and only raises it', async () => {
    const backend = memoryBackend();
    const a = await new SaveData(backend).load();
    expect(await a.recordScore(500)).toBe(true);
    expect(await a.recordScore(300)).toBe(false);
    expect(await a.recordScore(500)).toBe(false);
    const b = await new SaveData(backend).load();
    expect(b.best).toBe(500);
  });

  it('keeps the highest level reached', async () => {
    const backend = memoryBackend();
    const a = await new SaveData(backend).load();
    await a.recordLevel(3);
    await a.recordLevel(2);
    expect((await new SaveData(backend).load()).highestLevel).toBe(3);
  });

  it('persists sound, vibration and language', async () => {
    const backend = memoryBackend();
    const a = await new SaveData(backend).load();
    await a.updateSettings({ sound: false });
    await a.updateSettings({ vibration: false, language: 'en' });
    expect((await new SaveData(backend).load()).settings).toEqual({ sound: false, vibration: false, language: 'en' });
  });

  it('recovers from corrupt or tampered data', async () => {
    const backend = memoryBackend({
      [KEYS.best]: 'banana',
      [KEYS.highestLevel]: '-4',
      [KEYS.settings]: '{"sound":"yes","language":"fr"',
    });
    const s = await new SaveData(backend).load();
    expect(s.best).toBe(0);
    expect(s.highestLevel).toBe(1);
    expect(s.settings).toEqual(DEFAULT_SETTINGS);
  });

  it('keeps valid fields when others are bad', () => {
    expect(parseSettings('{"sound":false,"vibration":7,"language":"sw"}')).toEqual({ sound: false, vibration: true, language: 'sw' });
    expect(parseSettings('null')).toEqual(DEFAULT_SETTINGS);
  });

  it('ignores invalid settings updates', async () => {
    const s = await new SaveData(memoryBackend()).load();
    await s.updateSettings({ language: 'klingon' });
    expect(s.settings.language).toBe('both');
  });

  it('keeps playing when the storage itself fails', async () => {
    const broken = {
      getItem() {
        throw new Error('blocked');
      },
      setItem() {
        throw new Error('full');
      },
    };
    const s = await new SaveData(localStorageBackend(broken)).load();
    expect(s.best).toBe(0);
    await expect(s.recordScore(10)).resolves.toBe(true);
  });

  it('keeps playing when the browser blocks access to localStorage itself', async () => {
    const original = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
    Object.defineProperty(globalThis, 'localStorage', {
      configurable: true,
      get() {
        throw new Error('Access is denied for this document.');
      },
    });
    try {
      const s = await new SaveData(localStorageBackend()).load();
      expect(s.best).toBe(0);
      await expect(s.recordScore(10)).resolves.toBe(true);
    } finally {
      if (original) Object.defineProperty(globalThis, 'localStorage', original);
      else delete globalThis.localStorage;
    }
  });
});

describe('playfield scaling', () => {
  it('keeps the 480 × 640 shape on tall and wide screens', () => {
    const tall = fitField(392, 700, 480, 640);
    expect(tall.width).toBe(392);
    expect(tall.height).toBe(522);
    const wide = fitField(1000, 600, 480, 640);
    expect(wide.height).toBe(600);
    expect(wide.width).toBe(450);
  });

  it('never returns negative sizes', () => {
    expect(fitField(-10, 50, 480, 640)).toMatchObject({ width: 0, height: 0 });
  });
});
