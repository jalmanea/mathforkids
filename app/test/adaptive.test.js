import { test } from 'node:test';
import assert from 'node:assert/strict';
import { stepsFor, initialAdaptive, applyResult, inputFor } from '../src/game/adaptive.js';

const run = (results, stepCount, state = initialAdaptive()) => {
  const moves = [];
  for (const r of results) {
    const out = applyResult(state, r, stepCount);
    state = out.state;
    moves.push(out.moved);
  }
  return { state, moves };
};

test('steps: choice below the top tier, keypad at the top', () => {
  assert.deepEqual(stepsFor([1, 2, 3]), [
    { tier: 1, input: 'choice' },
    { tier: 2, input: 'choice' },
    { tier: 3, input: 'keypad' },
  ]);
  assert.deepEqual(stepsFor([1]), [
    { tier: 1, input: 'choice' },
    { tier: 1, input: 'keypad' },
  ]);
});

test('starts at the first step', () => {
  assert.equal(initialAdaptive().step, 0);
});

test('moves up after 5 first-try correct in a row', () => {
  const { state, moves } = run([true, true, true, true, true], 3);
  assert.equal(state.step, 1);
  assert.deepEqual(moves, [null, null, null, null, 'up']);
  assert.deepEqual(state.recent, [], 'window resets on a move');
});

test('a miss restarts the run', () => {
  const { state } = run([true, true, true, true, false, true, true, true, true], 3);
  assert.equal(state.step, 0);
  assert.equal(state.run, 4);
});

test('stays at the top step', () => {
  const { state, moves } = run(Array(12).fill(true), 2, { step: 1, run: 0, recent: [] });
  assert.equal(state.step, 1);
  assert.ok(moves.every((m) => m === null));
});

test('moves down after 3 misses in the last 5', () => {
  const { state, moves } = run([false, true, false, true, false], 3, { step: 2, run: 0, recent: [] });
  assert.equal(state.step, 1);
  assert.equal(moves.at(-1), 'down');
});

test('3 misses spread wider than 5 answers do not move down', () => {
  const { state } = run([false, true, true, false, true, true, false], 3, { step: 2, run: 0, recent: [] });
  assert.equal(state.step, 2);
});

test('never goes below the first step', () => {
  const { state } = run([false, false, false, false, false, false], 3);
  assert.equal(state.step, 0);
});

test('keypad only for plain-number answers', () => {
  const keypad = { tier: 3, input: 'keypad' };
  assert.equal(inputFor(keypad, '٥٨٦٣'), 'keypad');
  assert.equal(inputFor(keypad, '<'), 'choice');
  assert.equal(inputFor(keypad, '٣٤٥، ٣٥٦'), 'choice');
  assert.equal(inputFor({ tier: 1, input: 'choice' }, '٤'), 'choice');
});
