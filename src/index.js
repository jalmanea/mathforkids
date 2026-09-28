// Public API of the exercise engine.
//
//   import { loadCurriculum, generateExercise } from './src/index.js';
//   const curriculum = await loadCurriculum();        // Node; in the browser pass the parsed JSON
//   const ex = generateExercise(curriculum, 'g2-s1-u5-l7', 2);
//
import { GENERATORS } from './registry.js';
import { createRng } from './core/random.js';

export { toArabicDigits, fromArabicDigits } from './core/digits.js';
export * from './logging/attempt-log.js';

/** Index a parsed curriculum: lesson id -> lesson (with grade/semester/unit_id attached). */
export function indexCurriculum(curriculum) {
  const byId = new Map();
  for (const g of curriculum.grades) {
    for (const s of g.semesters) {
      for (const u of s.units) {
        for (const l of u.lessons) {
          byId.set(l.id, { ...l, grade: g.grade, semester: s.semester, unit_id: u.id });
        }
      }
    }
  }
  return byId;
}

const indexCache = new WeakMap();
function lessonsOf(curriculum) {
  if (!indexCache.has(curriculum)) indexCache.set(curriculum, indexCurriculum(curriculum));
  return indexCache.get(curriculum);
}

/** All lesson entries in curriculum order. */
export function listLessons(curriculum) {
  return [...lessonsOf(curriculum).values()];
}

/** Difficulty tiers a lesson supports, e.g. [1, 2, 3]. */
export function difficultiesOf(lesson) {
  return Object.keys(lesson.difficulties ?? {}).map(Number).sort();
}

/**
 * Generate one exercise.
 * @param {Object} curriculum  parsed curriculum.json
 * @param {string} lessonId
 * @param {number} difficulty  must be one of the lesson's tiers
 * @param {{seed?: number}} [opts]  pass a seed to reproduce an exercise exactly
 * @returns {import('./core/exercise.js').Exercise}
 */
export function generateExercise(curriculum, lessonId, difficulty, opts = {}) {
  const lesson = lessonsOf(curriculum).get(lessonId);
  if (!lesson) throw new Error(`unknown lesson ${lessonId}`);
  const tier = lesson.difficulties?.[difficulty];
  if (!tier) throw new Error(`lesson ${lessonId} has no difficulty ${difficulty} (has ${difficultiesOf(lesson)})`);
  const gen = GENERATORS[tier.generator ?? lesson.generator];
  if (!gen) throw new Error(`lesson ${lessonId}: unknown generator ${tier.generator ?? lesson.generator}`);
  const rng = createRng(opts.seed);
  return gen({ lesson, difficulty, params: tier.params, rng });
}

/** Node-only convenience loader. */
export async function loadCurriculum(path) {
  const { readFile } = await import('node:fs/promises');
  const url = path ?? new URL('../curriculum/curriculum.json', import.meta.url);
  return JSON.parse(await readFile(url, 'utf8'));
}
