// Every gameplay number lives here. Values come from the
// "Matofali: Game Design and Android Launch Guide" unless a comment says otherwise;
// deviations are recorded in docs/DECISIONS.md.

export const RULES = Object.freeze({
  // Fixed logical playfield, scaled to the screen.
  field: Object.freeze({ width: 480, height: 640 }),

  // Simulation runs at a fixed 60 steps per second.
  stepsPerSecond: 60,

  grid: Object.freeze({
    cols: 12,
    maxRows: 10,
    brickWidth: 36,
    brickHeight: 16,
    gap: 3,
    top: 70, // y of the first brick row (prototype value)
  }),

  paddle: Object.freeze({
    width: 84,
    wideWidth: 130,
    height: 12,
    y: 596, // top edge of the paddle (640 - 44, prototype value)
    follow: 0.5, // fraction of the distance to the finger covered each step (prototype value)
    maxBounceAngleDeg: 60, // hit at the very end of the paddle
  }),

  ball: Object.freeze({
    radius: 7,
    // Speed = base + perLevel × (level − 1) + perRound × (round − 1), units per step.
    baseSpeed: 5,
    speedPerLevel: 0.35,
    speedPerRound: 0.8,
    maxSpeed: 14, // DECISIONS D-04: cap so endless rounds stay playable
    launchSpreadDeg: 17, // launch is up to ±17° from vertical (prototype: ±0.3 rad)
    minSubsteps: 3,
    maxTravelPerSubstep: 3.5, // DECISIONS D-05: extra substeps at high speed
    // DECISIONS D-06: no trajectory may be flatter than this, measured from vertical.
    maxAngleFromVerticalDeg: 65,
  }),

  bricks: Object.freeze({
    // letter: { colour key, hits in round 1, whether rounds 2+ add a hit }
    g: Object.freeze({ kind: 'green', hits: 1, toughens: true }),
    y: Object.freeze({ kind: 'yellow', hits: 1, toughens: true }),
    b: Object.freeze({ kind: 'blue', hits: 1, toughens: true }),
    s: Object.freeze({ kind: 'snow', hits: 1, toughens: true }),
    o: Object.freeze({ kind: 'red', hits: 1, toughens: true }),
    k: Object.freeze({ kind: 'black', hits: 2, toughens: true }),
    r: Object.freeze({ kind: 'rock', hits: 2, toughens: true }),
    d: Object.freeze({ kind: 'wood', hits: 3, toughens: false }),
  }),
  extraHitsFromRound2: 1,
  levelsPerRound: 4,

  lives: Object.freeze({ start: 3, max: 6 }),

  score: Object.freeze({
    brickHitPerRound: 10, // each hit scores 10 × round number
    powerUp: 50,
    levelClear: 250,
  }),

  powerUps: Object.freeze({
    dropChance: 0.12,
    fallSpeed: 2.4,
    radius: 9,
    // Shares of drops; must add to 1.
    weights: Object.freeze({ wide: 0.45, multi: 0.44, life: 0.11 }),
    wideDurationSteps: 12 * 60,
    multiSplitDeg: 30,
  }),

  // Ball is removed once its top edge is this far below the field.
  ballOutMargin: 0,
});

export function roundForLevel(level, rules = RULES) {
  return Math.floor((level - 1) / rules.levelsPerRound) + 1;
}

export function ballSpeed(level, rules = RULES) {
  const round = roundForLevel(level, rules);
  const b = rules.ball;
  const raw = b.baseSpeed + b.speedPerLevel * (level - 1) + b.speedPerRound * (round - 1);
  return Math.min(raw, b.maxSpeed);
}

export function brickHits(letter, round, rules = RULES) {
  const def = rules.bricks[letter];
  if (!def) throw new Error(`Unknown brick letter "${letter}"`);
  return def.hits + (round >= 2 && def.toughens ? rules.extraHitsFromRound2 : 0);
}

export function brickHitPoints(round, rules = RULES) {
  return rules.score.brickHitPerRound * round;
}
