import { toArabicDigits } from './digits.js';

export const EXERCISE_SCHEMA_VERSION = 1;

/**
 * The common exercise object every generator returns.
 *
 * Student-facing fields (prompt, answer, choices, any `label`/`text` inside
 * `visual`) are Arabic only, with Arabic-Indic numerals.
 * Machine-facing fields (`data`, numeric fields of `visual`) use plain JS
 * numbers so tests, checkers and the parent dashboard can compute on them.
 *
 * @typedef {Object} Exercise
 * @property {string} exercise_id   Unique per generated instance; logs key on this.
 * @property {number} schema_version
 * @property {string} lesson_id
 * @property {number} difficulty    1..3 (only tiers the lesson defines)
 * @property {string} skill         Machine tag of the generated skill, e.g. "add.2d.regroup"
 * @property {string} type          arithmetic | word_problem | comparison | fill_blank | pattern | visual
 * @property {string} prompt        Arabic text shown to the child.
 * @property {string} answer        Correct answer as displayed (Arabic-Indic).
 * @property {string[]|null} choices Shuffled multiple-choice options incl. the answer, or null.
 * @property {Object|null} visual   Structured hint for rendering (fraction model, clock, coins...).
 * @property {Object} data          Machine-readable operands/answer for checking and analytics.
 * @property {number} seed          RNG seed; (lesson_id, difficulty, seed) reproduces the exercise.
 */

function newId() {
  // crypto.randomUUID exists in Node >= 19 and every modern browser (incl. iOS Safari 15.4+).
  return globalThis.crypto.randomUUID();
}

/**
 * Assemble an Exercise. Generators pass numbers for answer/choices;
 * formatting to Arabic-Indic happens here, in one place.
 */
export function makeExercise({
  lesson,
  difficulty,
  rng,
  skill,
  type = 'arithmetic',
  prompt,
  answer,
  choices = null,
  visual = null,
  data,
}) {
  const fmt = (v) => (typeof v === 'number' ? toArabicDigits(v) : String(v));
  return {
    exercise_id: newId(),
    schema_version: EXERCISE_SCHEMA_VERSION,
    lesson_id: lesson.id,
    difficulty,
    skill,
    type,
    prompt,
    answer: fmt(answer),
    choices: choices ? choices.map(fmt) : null,
    visual,
    data,
    seed: rng.seed,
  };
}
