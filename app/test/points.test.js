import { test } from 'node:test';
import assert from 'node:assert/strict';
import { basePoints, scoreExercise } from '../src/game/points.js';

test('base points by try', () => {
  assert.equal(basePoints(true, 1), 10);
  assert.equal(basePoints(true, 2), 5);
  assert.equal(basePoints(true, 3), 2);
  assert.equal(basePoints(true, 7), 2);
  assert.equal(basePoints(false, 3), 0, 'gave up earns nothing');
  assert.equal(basePoints(true, 0), 0);
});

test('bonus every 5 first-try correct in a row', () => {
  let state = { combo: 0 };
  const got = [];
  for (let i = 0; i < 10; i++) {
    const r = scoreExercise(state, { correct: true, attempts: 1, first_try_correct: true });
    got.push(r.points);
    state = { combo: r.combo };
  }
  assert.deepEqual(got, [10, 10, 10, 10, 20, 10, 10, 10, 10, 20]);
});

test('a miss resets the combo; a second-try answer does not extend it', () => {
  let state = { combo: 4 };
  let r = scoreExercise(state, { correct: true, attempts: 2, first_try_correct: false });
  assert.deepEqual(r, { points: 5, base: 5, bonus: 0, combo: 0 });
  r = scoreExercise({ combo: r.combo }, { correct: true, attempts: 1, first_try_correct: true });
  assert.equal(r.combo, 1);
  assert.equal(r.bonus, 0);
});
