// Content checks for curriculum/science.json. Science questions come from a
// written bank (lesson.content), so the bank itself is validated here: shape,
// language, no ambiguous options, and enough material for variety at each tier.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadCurriculum, listLessons, difficultiesOf } from '../src/index.js';
import { hasWesternDigits, hasLatinLetters } from '../src/core/digits.js';

const MIN_ASKABLE = 8; // distinct things to ask at every tier
const science = await loadCurriculum('science');
const lessons = listLessons(science);

const unique = (list, what) => assert.equal(new Set(list).size, list.length, `duplicate ${what}: ${list.filter((x, i) => list.indexOf(x) !== i)}`);
function arabic(s, where) {
  assert.equal(typeof s, 'string', `${where}: not a string`);
  assert.ok(s.trim() === s && s.length > 0, `${where}: empty or padded "${s}"`);
  assert.ok(/[ء-ي]/.test(s), `${where}: no Arabic in "${s}"`);
  assert.ok(!hasWesternDigits(s) && !hasLatinLetters(s), `${where}: Western digits or Latin letters in "${s}"`);
}

test('science: both grades and semesters are present, ids carry the subject prefix', () => {
  assert.equal(science.subject, 'العلوم');
  for (const grade of [2, 3]) for (const semester of [1, 2]) {
    assert.ok(lessons.some((l) => l.grade === grade && l.semester === semester), `no lessons for grade ${grade} semester ${semester}`);
  }
  for (const l of lessons) assert.ok(l.id.startsWith(`sci-g${l.grade}-s${l.semester}-u`), l.id);
});

for (const lesson of lessons) {
  test(`${lesson.id} content: ${lesson.title}`, () => {
    const c = lesson.content;
    assert.ok(c, 'no content');
    assert.equal(lesson.generator, 'sci.quiz');
    assert.deepEqual(difficultiesOf(lesson), [1, 2]);
    for (const d of [1, 2]) assert.equal(lesson.difficulties[d].params.level, d);

    const terms = c.terms ?? [];
    terms.forEach((t) => { arabic(t.term, 'term'); arabic(t.def, `definition of ${t.term}`); });
    unique(terms.map((t) => t.term), 'term');
    unique(terms.map((t) => t.def), 'definition');
    // A definition must not give its own word away.
    for (const t of terms) assert.ok(!t.def.includes(t.term), `definition of "${t.term}" contains the term`);

    for (const set of c.groups ?? []) {
      assert.ok(set.categories.length >= 2, 'a group set needs at least 2 categories');
      if (set.which) {
        assert.ok(set.which.includes('{x}'), `"${set.which}" has no {x}`);
        arabic(set.which.replace('{x}', 'س'), 'which');
      }
      unique(set.categories.map((k) => k.name), 'category');
      unique(set.categories.flatMap((k) => k.members), 'member (one thing in two categories is ambiguous)');
      for (const k of set.categories) {
        arabic(k.name, 'category');
        arabic(k.pick, `pick of ${k.name}`);
        assert.ok(k.members.length >= 2, `${k.name}: fewer than 2 members`);
        k.members.forEach((m) => arabic(m, `member of ${k.name}`));
      }
    }

    for (const seq of c.sequences ?? []) {
      arabic(seq.name, 'sequence name');
      assert.ok(seq.steps.length >= 3, `${seq.name}: fewer than 3 steps`);
      seq.steps.forEach((s) => arabic(s, `step of ${seq.name}`));
      unique(seq.steps, 'step');
    }

    const questions = c.questions ?? [];
    unique(questions.map((q) => q.q), 'question');
    for (const q of questions) {
      arabic(q.q, 'question');
      assert.ok(q.q.endsWith('؟') || q.q.endsWith('.') || q.q.endsWith(':') || q.q.includes('...'), `question has no ending mark: ${q.q}`);
      arabic(q.a, `answer of "${q.q}"`);
      assert.ok(q.wrong.length >= 3, `"${q.q}": fewer than 3 wrong options`);
      q.wrong.forEach((w) => arabic(w, `wrong option of "${q.q}"`));
      unique([q.a, ...q.wrong], `option in "${q.q}"`);
      assert.ok([undefined, 1, 2].includes(q.level), `"${q.q}": level must be 1 or 2`);
    }

    // Enough to ask at each tier (counted here independently of the generator).
    const grouped = (c.groups ?? []).reduce((n, set) => n + set.categories.reduce((m, k) => m + k.members.length, 0) * (set.which ? 2 : 1), 0);
    const sequenced = (c.sequences ?? []).reduce((n, s) => n + s.steps.length, 0);
    const named = terms.length >= 3 ? terms.length : 0;
    for (const d of [1, 2]) {
      const asked = questions.filter((q) => (q.level ?? 1) <= d).length;
      const total = named * d + grouped + sequenced + asked;
      assert.ok(total >= MIN_ASKABLE, `tier ${d}: only ${total} things to ask (need ${MIN_ASKABLE})`);
    }
    assert.ok(questions.some((q) => q.level === 2) || named, 'tier 2 adds nothing over tier 1');
  });
}
