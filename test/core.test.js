import { test } from 'node:test';
import assert from 'node:assert/strict';
import { toArabicDigits, fromArabicDigits, hasWesternDigits } from '../src/core/digits.js';
import { createRng } from '../src/core/random.js';
import { countNoun, NOUNS } from '../src/core/arabic.js';
import { numericChoices, addWithoutCarry, subtractSmallerFromLarger } from '../src/core/choices.js';
import { startAttempt, recordResponse } from '../src/logging/attempt-log.js';

test('toArabicDigits converts every digit and leaves text alone', () => {
  assert.equal(toArabicDigits(0), '٠');
  assert.equal(toArabicDigits(1234567890), '١٢٣٤٥٦٧٨٩٠');
  assert.equal(toArabicDigits('3 + 5 = ؟'), '٣ + ٥ = ؟');
  assert.equal(toArabicDigits('مع سارة 12 قلمًا'), 'مع سارة ١٢ قلمًا');
  assert.equal(toArabicDigits(2.5), '٢٫٥');
  assert.equal(hasWesternDigits(toArabicDigits('a1b2c3')), false);
});

test('fromArabicDigits round-trips', () => {
  for (const x of [0, 7, 45, 100, 9999]) assert.equal(Number(fromArabicDigits(toArabicDigits(x))), x);
});

test('rng is reproducible from its seed', () => {
  const a = createRng(42);
  const b = createRng(42);
  for (let i = 0; i < 20; i++) assert.equal(a.int(0, 1000), b.int(0, 1000));
});

test('countNoun applies Arabic number–noun agreement', () => {
  const p = NOUNS.pencil;
  assert.equal(countNoun(1, p), 'قلم واحد');
  assert.equal(countNoun(2, p), 'قلمان');
  assert.equal(countNoun(5, p), '٥ أقلام');
  assert.equal(countNoun(10, p), '١٠ أقلام');
  assert.equal(countNoun(11, p), '١١ قلمًا');
  assert.equal(countNoun(99, p), '٩٩ قلمًا');
  assert.equal(countNoun(100, p), '١٠٠ قلم');
  assert.equal(countNoun(105, p), '١٠٥ أقلام');
  assert.equal(countNoun(1, NOUNS.flower), 'وردة واحدة');
  assert.equal(countNoun(1, p, 'acc'), 'قلمًا واحدًا');
  assert.equal(countNoun(2, p, 'acc'), 'قلمين');
  assert.equal(countNoun(2, NOUNS.date, 'gen'), 'تمرتين');
  assert.equal(countNoun(7, p, 'acc'), '٧ أقلام');
});

test('mistake helpers model real slips', () => {
  assert.equal(addWithoutCarry(38, 47), 75);
  assert.equal(subtractSmallerFromLarger(52, 17), 45);
});

test('numericChoices: 4 distinct options, answer exactly once', () => {
  const rng = createRng(1);
  for (let i = 0; i < 200; i++) {
    const c = numericChoices(rng, 5, [5, 6, 6, -1, 4], { min: 0 });
    assert.equal(c.length, 4);
    assert.equal(new Set(c).size, 4);
    assert.equal(c.filter((x) => x === 5).length, 1);
    assert.ok(c.every((x) => x >= 0));
  }
});

test('attempt log: typed Western digits are normalized, attempts counted', () => {
  const exercise = { exercise_id: 'x', lesson_id: 'l', difficulty: 1, skill: 's', answer: '٧٧' };
  const t0 = new Date('2026-01-01T10:00:00Z');
  let log = startAttempt({ exercise, lesson: { unit_id: 'u', grade: 2, semester: 1 }, sessionId: 's1', now: t0 });
  log = recordResponse(log, '67', new Date(t0.getTime() + 4000));
  assert.equal(log.outcome, 'in_progress');
  log = recordResponse(log, '77', new Date(t0.getTime() + 9000));
  assert.equal(log.outcome, 'correct');
  assert.equal(log.attempts, 2);
  assert.equal(log.first_try_correct, false);
  assert.equal(log.time_spent_ms, 9000);
});
