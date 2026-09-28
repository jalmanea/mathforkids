import { test } from 'node:test';
import assert from 'node:assert/strict';
import { starsFor, initialProgress, updateProgress, levelFor, levelThreshold } from '../src/game/progress.js';
import { dailyActivity, accuracyByUnit, needsPractice, sessionRows } from '../src/game/stats.js';

test('stars from top-step first-try accuracy', () => {
  assert.equal(starsFor([true, true, true, true]), 0, 'too few answers');
  assert.equal(starsFor(Array(10).fill(true)), 3);
  assert.equal(starsFor([...Array(7).fill(true), false, false, false]), 2);
  assert.equal(starsFor([true, false, false, false, false]), 1);
});

test('only answers on the top step count toward stars, and stars never drop', () => {
  let p = initialProgress('L1');
  for (let i = 0; i < 5; i++) p = updateProgress(p, { firstTryCorrect: true, stepCount: 2 }).progress;
  assert.equal(p.adaptive.step, 1, 'moved to the keypad step');
  assert.equal(p.stars, 0);
  assert.deepEqual(p.top_recent, []);

  let gained = 0;
  for (let i = 0; i < 5; i++) {
    const r = updateProgress(p, { firstTryCorrect: true, stepCount: 2 });
    p = r.progress;
    gained += r.starsGained;
  }
  assert.equal(p.stars, 3);
  assert.equal(gained, 3);

  for (let i = 0; i < 10; i++) p = updateProgress(p, { firstTryCorrect: i % 2 === 0, stepCount: 2 }).progress;
  assert.equal(p.stars, 3, 'best rating kept');
  assert.equal(p.attempts, 20);
  assert.equal(p.first_try, 15);
});

test('levels', () => {
  assert.deepEqual([0, 100, 300, 600, 1000].map(levelThreshold).length, 5);
  assert.equal(levelFor(0).level, 1);
  assert.equal(levelFor(99).level, 1);
  assert.equal(levelFor(100).level, 2);
  assert.equal(levelFor(299).level, 2);
  assert.equal(levelFor(300).level, 3);
  assert.equal(levelFor(200).fraction, 0.5);
});

const at = (d, h = 12) => new Date(2026, 8, d, h).toISOString();
const a = (o) => ({ outcome: 'correct', first_try_correct: true, time_spent_ms: 30000, points: 10, ...o });

test('daily activity covers 14 local days with minutes', () => {
  const rows = dailyActivity([a({ finished_at: at(29) }), a({ finished_at: at(29) }), a({ finished_at: at(1) })], 14, new Date(2026, 8, 29, 20));
  assert.equal(rows.length, 14);
  assert.equal(rows.at(-1).day, '2026-09-29');
  assert.equal(rows.at(-1).exercises, 2);
  assert.equal(rows.at(-1).minutes, 1);
  assert.equal(rows.reduce((s, r) => s + r.exercises, 0), 2, 'the 1st is outside the window');
});

test('accuracy by unit and lesson, in curriculum order', () => {
  const lessons = [{ id: 'a1', unit_id: 'A' }, { id: 'a2', unit_id: 'A' }, { id: 'b1', unit_id: 'B' }];
  const attempts = [a({ lesson_id: 'b1' }), a({ lesson_id: 'a2', first_try_correct: false }), a({ lesson_id: 'a2' })];
  const units = accuracyByUnit(attempts, lessons);
  assert.deepEqual(units.map((u) => u.unit_id), ['A', 'B']);
  assert.equal(units[0].acc, 0.5);
  assert.deepEqual(units[0].lessons.map((l) => l.lesson_id), ['a2']);
});

test('needs-practice lists weak skills with enough answers, weakest first', () => {
  const attempts = [
    ...Array.from({ length: 6 }, (_, i) => a({ skill: 's1', lesson_id: 'x', first_try_correct: i < 3 })),
    ...Array.from({ length: 6 }, (_, i) => a({ skill: 's2', lesson_id: 'y', first_try_correct: i < 1 })),
    ...Array.from({ length: 6 }, () => a({ skill: 's3', lesson_id: 'z' })),
    ...Array.from({ length: 2 }, () => a({ skill: 's4', lesson_id: 'w', first_try_correct: false })),
  ];
  assert.deepEqual(needsPractice(attempts).map((s) => s.skill), ['s2', 's1']);
});

test('session rows', () => {
  const sessions = [{ session_id: 's1', started_at: at(1) }, { session_id: 's2', started_at: at(2) }, { session_id: 's3', started_at: at(3) }];
  const rows = sessionRows(sessions, [a({ session_id: 's1' }), a({ session_id: 's2', first_try_correct: false, points: 5 })]);
  assert.deepEqual(rows.map((r) => r.session_id), ['s2', 's1'], 'empty sessions dropped, newest first');
  assert.equal(rows[0].acc, 0);
  assert.equal(rows[0].points, 5);
});
