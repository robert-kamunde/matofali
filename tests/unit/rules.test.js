import { describe, it, expect } from 'vitest';
import { RULES, roundForLevel, ballSpeed, brickHits, brickHitPoints } from '../../src/config/rules.js';
import { LEVELS, validateLevel, levelDefinition, generateLevel, generatedDifficulty, PATTERN_IDS } from '../../src/config/levels.js';

describe('difficulty progression', () => {
  it('groups four levels into each round', () => {
    expect([1, 2, 3, 4].map((l) => roundForLevel(l))).toEqual([1, 1, 1, 1]);
    expect([5, 8, 9, 13].map((l) => roundForLevel(l))).toEqual([2, 2, 3, 4]);
  });

  it('matches the speed examples in the design guide', () => {
    expect(ballSpeed(1)).toBeCloseTo(5, 5);
    expect(ballSpeed(4)).toBeCloseTo(6.05, 5); // "about 6"
    expect(ballSpeed(5)).toBeCloseTo(7.2, 5); // "about 7.2"
  });

  it('caps speed so endless rounds stay playable', () => {
    expect(ballSpeed(100)).toBe(RULES.ball.maxSpeed);
    for (let l = 1; l < 60; l++) expect(ballSpeed(l + 1)).toBeGreaterThanOrEqual(ballSpeed(l));
  });

  it('gives each brick its documented strength', () => {
    const round1 = Object.fromEntries('gybsokrd'.split('').map((c) => [c, brickHits(c, 1)]));
    expect(round1).toEqual({ g: 1, y: 1, b: 1, s: 1, o: 1, k: 2, r: 2, d: 3 });
  });

  it('adds one hit from round 2, except Zanzibar door wood', () => {
    const round2 = Object.fromEntries('gybsokrd'.split('').map((c) => [c, brickHits(c, 2)]));
    expect(round2).toEqual({ g: 2, y: 2, b: 2, s: 2, o: 2, k: 3, r: 3, d: 3 });
    expect(brickHits('k', 5)).toBe(3);
  });

  it('scores 10 × round per hit', () => {
    expect([1, 2, 3].map((r) => brickHitPoints(r))).toEqual([10, 20, 30]);
  });

  it('rejects unknown bricks', () => {
    expect(() => brickHits('z', 1)).toThrow(/Unknown brick/);
  });

  it('power-up shares add up to 1', () => {
    const sum = Object.values(RULES.powerUps.weights).reduce((a, b) => a + b, 0);
    expect(sum).toBeCloseTo(1, 10);
  });
});

describe('levels', () => {
  it('ships the four documented levels in order', () => {
    expect(LEVELS.map((l) => l.id)).toEqual(['bendera', 'kilimanjaro', 'zanzibar', 'serengeti']);
  });

  it.each(LEVELS.map((l) => [l.id, l]))('%s is a valid 12-wide grid of known bricks', (_id, def) => {
    expect(validateLevel(def, RULES)).toBe(true);
  });

  it('uses the multi-hit bricks each level is documented with', () => {
    const has = (id, c) => LEVELS.find((l) => l.id === id).rows.join('').includes(c);
    expect(has('bendera', 'k')).toBe(true);
    expect(has('kilimanjaro', 'r')).toBe(true);
    expect(has('kilimanjaro', 's')).toBe(true);
    expect(has('zanzibar', 'd')).toBe(true);
    expect(has('zanzibar', 'o')).toBe(true);
    expect(has('serengeti', 'k')).toBe(true);
    expect(has('serengeti', 'o')).toBe(true);
  });

  it('cycles through the given levels when generation is turned off', () => {
    expect(levelDefinition(5, LEVELS, null).id).toBe('bendera');
    expect(levelDefinition(8, LEVELS, null).id).toBe('serengeti');
    expect(levelDefinition(10, LEVELS, null).id).toBe('kilimanjaro');
  });

  it('reports a malformed level clearly', () => {
    const bad = { id: 'bad', nameKey: 'a', subtitleKey: 'b', rows: ['ggg'] };
    expect(() => validateLevel(bad, RULES)).toThrow(/3 cells, expected 12/);
    const unknown = { ...bad, rows: ['gggggggggggz'] };
    expect(() => validateLevel(unknown, RULES)).toThrow(/unknown brick "z"/);
  });
});

describe('endless generated levels', () => {
  it('keeps the four hand-made levels first, then generates from level 5', () => {
    expect([1, 2, 3, 4].map((l) => levelDefinition(l).id)).toEqual(['bendera', 'kilimanjaro', 'zanzibar', 'serengeti']);
    expect(levelDefinition(5).id).toBe('generated-5');
    expect(levelDefinition(5).generated).toBe(true);
  });

  it('every generated level from 5 to 1000 is valid, mirrored and has enough bricks', () => {
    const patterns = new Set();
    for (let l = 5; l <= 1000; l++) {
      const def = generateLevel(l);
      expect(validateLevel(def, RULES)).toBe(true);
      for (const row of def.rows) expect(row).toBe([...row].reverse().join(''));
      const bricks = def.rows.join('').replace(/\./g, '');
      expect(bricks.length, `level ${l}`).toBeGreaterThanOrEqual(24);
      expect(bricks.replace(/d/g, '').length, `level ${l} breakable`).toBeGreaterThan(0);
      patterns.add(def.nameKey);
    }
    expect(patterns.size).toBe(PATTERN_IDS.length);
  });

  it('the same level number always gives the same layout', () => {
    const a = generateLevel(42).rows.join('/');
    expect(levelDefinition(42).rows.join('/')).toBe(a);
    expect(generateLevel(43).rows.join('/')).not.toBe(a);
  });

  it('gets harder slowly and then levels off', () => {
    const d = (l) => generatedDifficulty(l);
    expect(d(5)).toEqual({ rows: 6, toughShare: 0.1, woodShare: 0 });
    for (let l = 5; l < 200; l++) {
      expect(d(l + 1).rows).toBeGreaterThanOrEqual(d(l).rows);
      expect(d(l + 1).toughShare).toBeGreaterThanOrEqual(d(l).toughShare);
      expect(d(l + 1).woodShare).toBeGreaterThanOrEqual(d(l).woodShare);
    }
    expect(d(200)).toEqual({ rows: 10, toughShare: 0.45, woodShare: 0.2 });
    // Over many levels, later ones really do hold more tough bricks.
    const toughCount = (from) => {
      let n = 0;
      for (let l = from; l < from + 10; l++) n += generateLevel(l).rows.join('').replace(/[^krd]/g, '').length;
      return n;
    };
    expect(toughCount(100)).toBeGreaterThan(toughCount(5) * 2);
  });
});
