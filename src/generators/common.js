// Shared plumbing for generator families.
import { makeExercise } from '../core/exercise.js';
import { numericChoices, stringChoices } from '../core/choices.js';

/**
 * Every generator receives one context object:
 * @typedef {Object} GenContext
 * @property {Object} lesson       Lesson entry from curriculum/curriculum.json
 * @property {number} difficulty
 * @property {Object} params       lesson.difficulties[difficulty].params
 * @property {import('../core/random.js').Rng} rng
 */

/** Numeric multiple-choice exercise. */
export function numericMC(ctx, { answer, mistakes = [], choiceOpts, ...rest }) {
  return makeExercise({
    lesson: ctx.lesson,
    difficulty: ctx.difficulty,
    rng: ctx.rng,
    answer,
    choices: numericChoices(ctx.rng, answer, mistakes, choiceOpts),
    ...rest,
  });
}

/** Multiple choice over fixed Arabic strings (words, symbols, shape names...). */
export function stringMC(ctx, { answer, wrong, count = 4, ...rest }) {
  return makeExercise({
    lesson: ctx.lesson,
    difficulty: ctx.difficulty,
    rng: ctx.rng,
    answer,
    choices: stringChoices(ctx.rng, answer, wrong, count),
    ...rest,
  });
}

/**
 * Rejection sampling: call `draw` until `accept` passes. Generators use this to
 * honour constraints (e.g. "must regroup") without skewing into edge cases.
 */
export function sampleUntil(draw, accept, tries = 2000) {
  for (let i = 0; i < tries; i++) {
    const x = draw();
    if (accept(x)) return x;
  }
  throw new Error('sampleUntil: constraints unsatisfiable (check lesson params)');
}

/** Random integer with exactly `d` digits. */
export function randDigits(rng, d) {
  return d === 1 ? rng.int(0, 9) : rng.int(10 ** (d - 1), 10 ** d - 1);
}

/** Read [min,max] from params.range or build it from params.digits. */
export function rangeOf(params, key = 'range') {
  if (params[key]) return params[key];
  throw new Error(`missing params.${key}`);
}

/** Does column addition a+b need any carry? */
export function needsCarry(a, b) {
  for (; a > 0 || b > 0; a = Math.floor(a / 10), b = Math.floor(b / 10)) {
    if ((a % 10) + (b % 10) >= 10) return true;
  }
  return false;
}

/** Does column subtraction a-b need any borrow? */
export function needsBorrow(a, b) {
  for (; a > 0 || b > 0; a = Math.floor(a / 10), b = Math.floor(b / 10)) {
    if (a % 10 < b % 10) return true;
  }
  return false;
}

/** Accept a value according to a regrouping policy. */
export function regroupOk(policy, regrouped) {
  if (policy === 'none') return !regrouped;
  if (policy === 'required') return regrouped;
  return true; // 'any'
}
