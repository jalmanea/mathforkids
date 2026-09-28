// Multiple-choice assembly. Generators supply *plausible-mistake* candidates
// (forgot to regroup, off by one, place-value slip...); this module dedupes,
// filters, tops up and shuffles.

/**
 * @param {import('./random.js').Rng} rng
 * @param {number} correct
 * @param {number[]} mistakes   Candidate wrong answers, most-plausible first.
 * @param {{count?: number, min?: number, max?: number, step?: number}} [opts]
 * @returns {number[]} shuffled choices, always containing `correct` exactly once
 */
export function numericChoices(rng, correct, mistakes, opts = {}) {
  const { count = 4, min = 0, max = Infinity, step = 1 } = opts;
  const ok = (v) => Number.isInteger(v) && v >= min && v <= max && v !== correct;
  const picked = [];
  for (const m of mistakes) {
    if (picked.length >= count - 1) break;
    if (ok(m) && !picked.includes(m)) picked.push(m);
  }
  // Top up with near neighbours so options never look random.
  for (let d = 1; picked.length < count - 1 && d < 1000; d++) {
    for (const v of rng.shuffle([correct + d * step, correct - d * step])) {
      if (picked.length < count - 1 && ok(v) && !picked.includes(v)) picked.push(v);
    }
  }
  return rng.shuffle([correct, ...picked]);
}

/** Same idea for non-numeric options (strings). */
export function stringChoices(rng, correct, wrong, count = 4) {
  const picked = [...new Set(wrong.filter((w) => w !== correct))].slice(0, count - 1);
  return rng.shuffle([correct, ...picked]);
}

// ---- common arithmetic mistakes -------------------------------------------

const digitsOf = (x) => String(x).split('').map(Number);

/** Column addition that drops every carry (e.g. 38+47 -> 75). */
export function addWithoutCarry(a, b) {
  const da = digitsOf(a).reverse();
  const db = digitsOf(b).reverse();
  let out = 0;
  for (let i = 0, p = 1; i < Math.max(da.length, db.length); i++, p *= 10) {
    out += (((da[i] ?? 0) + (db[i] ?? 0)) % 10) * p;
  }
  return out;
}

/** Column subtraction that takes smaller-from-larger in each column (e.g. 52-17 -> 45). */
export function subtractSmallerFromLarger(a, b) {
  const da = digitsOf(a).reverse();
  const db = digitsOf(b).reverse();
  let out = 0;
  for (let i = 0, p = 1; i < da.length; i++, p *= 10) {
    out += Math.abs((da[i] ?? 0) - (db[i] ?? 0)) * p;
  }
  return out;
}

/** Swap tens and ones of a 2-digit number (e.g. 47 -> 74). */
export function reverseDigits(x) {
  return Number(String(x).split('').reverse().join(''));
}
