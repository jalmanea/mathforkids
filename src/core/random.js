// Seedable RNG so a generated exercise can be reproduced exactly (useful for
// debugging a logged attempt, and for deterministic tests).

/** mulberry32: tiny, fast, good enough for exercise generation. */
function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function randomSeed() {
  return Math.floor(Math.random() * 2 ** 32);
}

/**
 * @typedef {ReturnType<typeof createRng>} Rng
 */
export function createRng(seed = randomSeed()) {
  const next = mulberry32(seed);
  const rng = {
    seed,
    /** float in [0, 1) */
    next,
    /** integer in [min, max] inclusive */
    int(min, max) {
      if (max < min) throw new Error(`rng.int: empty range [${min}, ${max}]`);
      return min + Math.floor(next() * (max - min + 1));
    },
    pick(arr) {
      if (!arr.length) throw new Error('rng.pick: empty array');
      return arr[Math.floor(next() * arr.length)];
    },
    bool(p = 0.5) {
      return next() < p;
    },
    shuffle(arr) {
      const a = [...arr];
      for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(next() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
      }
      return a;
    },
    /** k distinct items from arr */
    sample(arr, k) {
      return rng.shuffle(arr).slice(0, k);
    },
  };
  return rng;
}
