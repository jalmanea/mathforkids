import { test } from 'node:test';
import assert from 'node:assert/strict';
import { countByDay, computeStreak } from '../src/game/streak.js';
import { dayKey, addDays, lastDays } from '../src/game/days.js';

// All dates are built with the local-time Date constructor, so these tests
// hold in any timezone the suite runs in.
const at = (y, m, d, h = 12, min = 0) => new Date(y, m - 1, d, h, min);
const finished = (date, outcome = 'correct') => ({ outcome, finished_at: date.toISOString() });

/** counts map with `goal` exercises on each listed day key */
const daysMet = (keys, goal = 20) => new Map(keys.map((k) => [k, goal]));

test('day keys use local time around midnight', () => {
  assert.equal(dayKey(at(2026, 9, 28, 23, 59)), '2026-09-28');
  assert.equal(dayKey(at(2026, 9, 29, 0, 1)), '2026-09-29');
  assert.equal(addDays('2026-03-01', -1), '2026-02-28');
  assert.equal(addDays('2028-03-01', -1), '2028-02-29');
  assert.equal(addDays('2026-12-31', 1), '2027-01-01');
  assert.deepEqual(lastDays('2026-10-02', 3), ['2026-09-30', '2026-10-01', '2026-10-02']);
});

test('exercises either side of midnight land on different days', () => {
  const attempts = [
    ...Array.from({ length: 10 }, () => finished(at(2026, 9, 28, 23, 58))),
    ...Array.from({ length: 10 }, () => finished(at(2026, 9, 29, 0, 2))),
    { outcome: 'in_progress', finished_at: null },
    finished(at(2026, 9, 29, 0, 3), 'skipped'),
  ];
  const counts = countByDay(attempts);
  assert.equal(counts.get('2026-09-28'), 10);
  assert.equal(counts.get('2026-09-29'), 10, 'in-progress and skipped do not count');
  const s = computeStreak(counts, 20, at(2026, 9, 29, 8));
  assert.equal(s.streak, 0, 'neither day reached 20 on its own');
  assert.equal(s.todayCount, 10);
});

test('gave-up exercises count toward the goal', () => {
  const counts = countByDay(Array.from({ length: 20 }, () => finished(at(2026, 9, 29, 9), 'gave_up')));
  assert.equal(computeStreak(counts, 20, at(2026, 9, 29, 10)).todayMet, true);
});

test('consecutive goal days', () => {
  const now = at(2026, 9, 29, 18);
  const counts = daysMet(['2026-09-26', '2026-09-27', '2026-09-28', '2026-09-29']);
  assert.equal(computeStreak(counts, 20, now).streak, 4);
});

test('today not yet met keeps yesterday\'s streak alive', () => {
  const counts = daysMet(['2026-09-26', '2026-09-27', '2026-09-28']);
  counts.set('2026-09-29', 5);
  const s = computeStreak(counts, 20, at(2026, 9, 29, 9));
  assert.equal(s.streak, 3);
  assert.equal(s.todayMet, false);
  assert.deepEqual(s.frozeDays, []);
});

test('one missed day in a week is forgiven', () => {
  const counts = daysMet(['2026-09-24', '2026-09-25', '2026-09-27', '2026-09-28', '2026-09-29']);
  const s = computeStreak(counts, 20, at(2026, 9, 29, 20));
  assert.equal(s.streak, 5, 'the gap on the 26th does not count, but does not break');
  assert.deepEqual(s.frozeDays, ['2026-09-26']);
});

test('two missed days within a week break the streak', () => {
  const counts = daysMet(['2026-09-22', '2026-09-23', '2026-09-25', '2026-09-27', '2026-09-28']);
  const s = computeStreak(counts, 20, at(2026, 9, 28, 20));
  assert.equal(s.streak, 3, '27, 28 and 25 (26 forgiven); 24 is a second miss within 7 days');
});

test('two consecutive missed days break the streak', () => {
  const counts = daysMet(['2026-09-20', '2026-09-21', '2026-09-24', '2026-09-25']);
  assert.equal(computeStreak(counts, 20, at(2026, 9, 25, 20)).streak, 2);
});

test('misses a week apart are both forgiven', () => {
  const met = lastDays('2026-09-29', 20).filter((k) => k !== '2026-09-27' && k !== '2026-09-20');
  const s = computeStreak(daysMet(met), 20, at(2026, 9, 29, 20));
  assert.equal(s.streak, 18);
  assert.deepEqual(s.frozeDays, ['2026-09-27', '2026-09-20']);
});

test('missed yesterday and nothing before: no streak, no freeze used', () => {
  const counts = daysMet(['2026-09-20']);
  const s = computeStreak(counts, 20, at(2026, 9, 29, 9));
  assert.equal(s.streak, 0);
  assert.deepEqual(s.frozeDays, []);
});

test('the goal is configurable', () => {
  const counts = new Map([['2026-09-29', 10]]);
  assert.equal(computeStreak(counts, 10, at(2026, 9, 29, 20)).streak, 1);
  assert.equal(computeStreak(counts, 20, at(2026, 9, 29, 20)).streak, 0);
});
