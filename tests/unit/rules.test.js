import { describe, it, expect } from 'vitest';
import { RULES, roundForLevel, ballSpeed, brickHits, brickHitPoints } from '../../src/config/rules.js';
import { LEVELS, validateLevel, levelDefinition } from '../../src/config/levels.js';

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

  it('cycles back to level 1 after level 4', () => {
    expect(levelDefinition(5).id).toBe('bendera');
    expect(levelDefinition(8).id).toBe('serengeti');
    expect(levelDefinition(10).id).toBe('kilimanjaro');
  });

  it('reports a malformed level clearly', () => {
    const bad = { id: 'bad', nameKey: 'a', subtitleKey: 'b', rows: ['ggg'] };
    expect(() => validateLevel(bad, RULES)).toThrow(/3 cells, expected 12/);
    const unknown = { ...bad, rows: ['gggggggggggz'] };
    expect(() => validateLevel(unknown, RULES)).toThrow(/unknown brick "z"/);
  });
});
