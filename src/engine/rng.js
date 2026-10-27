// Seedable random numbers so gameplay can be replayed exactly in tests.
// mulberry32: small, fast, good enough for a game.

export function createRng(seed = Date.now()) {
  let a = seed >>> 0;
  const next = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return next;
}

/** A fake RNG that returns the given values in order, then repeats the last one. */
export function sequenceRng(values) {
  let i = 0;
  return () => values[Math.min(i++, values.length - 1)];
}
