// Validation suite: for every lesson × difficulty, generate N exercises and assert
//  1. shape: required fields, unique exercise_id, choices contain the answer exactly once
//  2. language: student-facing text is Arabic with Arabic-Indic numerals only
//  3. correctness: answer verified independently (equation substitution or per-skill checker)
//  4. constraints: generated values stay within the lesson's declared limits
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadCurriculum, listLessons, difficultiesOf, generateExercise } from '../src/index.js';
import { GENERATORS } from '../src/registry.js';
import { hasWesternDigits, hasLatinLetters } from '../src/core/digits.js';
import { checkEquationPrompt, checkEquationAnswer, findSkillChecker } from './checkers.js';
import { CONSTRAINTS } from './constraints.js';

const N = Number(process.env.N ?? 50);
const SMALL_DOMAIN = new Set([
  'geo.solids', 'geo.plane', 'geo.compare_shapes', 'geo.compose', 'geo.symmetry',
  'measure.choose_unit', 'time.estimate', 'time.sequence', 'word.simpler_problem', 'div.zero_one',
]);
const curriculum = await loadCurriculum();
const lessons = listLessons(curriculum);

/** Every student-facing string in an exercise. */
function studentText(ex) {
  const out = [ex.prompt, ex.answer, ...(ex.choices ?? [])];
  const walk = (v) => {
    if (!v || typeof v !== 'object') return;
    for (const [k, val] of Object.entries(v)) {
      if (['label', 'title', 'key_label', 'text'].includes(k) && typeof val === 'string') out.push(val);
      else if (k === 'columns' && Array.isArray(val)) out.push(...val);
      else if (typeof val === 'object') walk(val);
    }
  };
  walk(ex.visual);
  return out;
}

function assertLanguage(ex) {
  for (const s of studentText(ex)) {
    assert.ok(!hasWesternDigits(s), `Western digits in "${s}"`);
    assert.ok(!hasLatinLetters(s), `Latin letters in "${s}"`);
    assert.ok(/[؀-ۿ]/.test(s) || /^[⁦-⁩><=]+$/.test(s.replace(/[٠-٩/ ،:+\-×÷()=؟]/g, '')) || s.length > 0, `empty text`);
  }
  assert.ok(/[ء-ي]/.test(ex.prompt) || /[٠-٩]/.test(ex.prompt), `prompt has no Arabic: ${ex.prompt}`);
}

function assertShape(ex, lesson, difficulty, seen) {
  assert.match(ex.exercise_id, /^[0-9a-f-]{36}$/);
  assert.ok(!seen.has(ex.exercise_id), 'exercise_id reused');
  seen.add(ex.exercise_id);
  assert.equal(ex.lesson_id, lesson.id);
  assert.equal(ex.difficulty, difficulty);
  for (const k of ['skill', 'type', 'prompt', 'answer', 'data']) assert.ok(ex[k] !== undefined && ex[k] !== '', `missing ${k}`);
  assert.equal(typeof ex.seed, 'number');
  if (ex.choices) {
    assert.ok(ex.choices.length >= 2, 'fewer than 2 choices');
    assert.equal(new Set(ex.choices).size, ex.choices.length, `duplicate choices ${ex.choices}`);
    assert.equal(ex.choices.filter((c) => c === ex.answer).length, 1, `answer not exactly once in choices`);
  }
}

function assertCorrect(ex) {
  const byEquation = checkEquationPrompt(ex, assert);
  const byAnswerEq = checkEquationAnswer(ex, assert);
  const checker = findSkillChecker(ex.skill);
  if (checker) checker(ex, ex.data, assert);
  assert.ok(byEquation || byAnswerEq || checker, `no independent correctness check for skill "${ex.skill}"`);
}

function assertConstraints(ex, lesson, difficulty) {
  const tier = lesson.difficulties[difficulty];
  let key = tier.generator ?? lesson.generator;
  let params = tier.params;
  if (key === 'mix') {
    const entry = params.pool[ex.data.mix_entry];
    assert.ok(entry, 'mix exercise missing mix_entry');
    key = entry.generator;
    params = entry.params;
  }
  const check = CONSTRAINTS[key];
  assert.ok(check, `no constraint checker for generator "${key}"`);
  check(ex, params, assert);
}

test('curriculum: ids unique, well-formed, every generator exists', () => {
  const ids = new Set();
  for (const l of lessons) {
    assert.match(l.id, /^g[23]-s[12]-u\d+-[lxpe]\d+$/, l.id);
    assert.ok(!ids.has(l.id), `duplicate ${l.id}`);
    ids.add(l.id);
    assert.ok(/[ء-ي]/.test(l.title) && !hasWesternDigits(l.title), `title ${l.id}`);
    assert.ok(/[ء-ي]/.test(l.objective) && !hasWesternDigits(l.objective), `objective ${l.id}`);
    const tiers = difficultiesOf(l);
    assert.ok(tiers.length >= 1, `${l.id} has no difficulty tiers`);
    for (const d of tiers) {
      const key = l.difficulties[d].generator ?? l.generator;
      assert.ok(GENERATORS[key], `${l.id}: unknown generator ${key}`);
      if (key === 'mix') for (const e of l.difficulties[d].params.pool) assert.ok(GENERATORS[e.generator], `${l.id}: unknown ${e.generator}`);
    }
  }
  for (const g of curriculum.grades) for (const s of g.semesters) for (const u of s.units) assert.ok(!hasWesternDigits(u.title), u.id);
});

test('generation is reproducible from (lesson, difficulty, seed)', () => {
  for (const l of lessons) {
    const a = generateExercise(curriculum, l.id, 1, { seed: 12345 });
    const b = generateExercise(curriculum, l.id, 1, { seed: 12345 });
    assert.equal(a.prompt, b.prompt);
    assert.deepEqual(a.choices, b.choices);
    assert.notEqual(a.exercise_id, b.exercise_id, 'each generated instance needs its own id');
  }
});

const seen = new Set();
for (const lesson of lessons) {
  test(`${lesson.id} ${lesson.title}`, () => {
    for (const d of difficultiesOf(lesson)) {
      const prompts = new Set();
      for (let i = 0; i < N; i++) {
        const seed = (i + 1) * 7919 + d * 104729 + lesson.id.length;
        let ex;
        try {
          ex = generateExercise(curriculum, lesson.id, d, { seed });
        } catch (e) {
          throw new Error(`${lesson.id} d${d} seed ${seed}: generation failed: ${e.message}`);
        }
        try {
          assertShape(ex, lesson, d, seen);
          assertLanguage(ex);
          assertCorrect(ex);
          assertConstraints(ex, lesson, d);
        } catch (e) {
          e.message = `${lesson.id} d${d} seed ${seed}\n  prompt: ${ex.prompt}\n  answer: ${ex.answer}\n  choices: ${ex.choices}\n  ${e.message}`;
          throw e;
        }
        prompts.add(ex.prompt + (ex.visual ? JSON.stringify(ex.visual) : ''));
      }
      // randomized, not a fixed bank: expect real variety. Generators that draw from a
      // small fixed fact set (names of solids, units...) can't produce many distinct items.
      const key = lesson.difficulties[d].generator ?? lesson.generator;
      const want = SMALL_DOMAIN.has(key) ? 2 : Math.min(5, N / 10);
      assert.ok(prompts.size >= want, `${lesson.id} d${d}: only ${prompts.size} distinct exercises in ${N}`);
    }
  });
}
