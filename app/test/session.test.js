import { test } from 'node:test';
import assert from 'node:assert/strict';
import { planSession, reviewWeight, skillStats, pickWeighted } from '../src/game/session.js';
import { createRng } from '../../src/core/random.js';

const log = (lesson_id, skill, first_try_correct) => ({ lesson_id, skill, first_try_correct, outcome: 'correct' });

test('20-exercise session: 16 chosen, 4 review, review never first', () => {
  const plan = planSession({ lessonId: 'L5', reviewPool: ['L1', 'L2'], attempts: [], length: 20, random: createRng(1).next });
  assert.equal(plan.length, 20);
  assert.equal(plan.filter((p) => p.review).length, 4);
  assert.equal(plan.filter((p) => p.lessonId === 'L5').length, 16);
  assert.equal(plan[0].review, false);
  assert.ok(plan.filter((p) => p.review).every((p) => ['L1', 'L2'].includes(p.lessonId)));
});

test('no earlier lessons: the whole session is the chosen lesson', () => {
  const plan = planSession({ lessonId: 'L1', reviewPool: [], attempts: [], length: 20 });
  assert.ok(plan.every((p) => p.lessonId === 'L1' && !p.review));
});

test('weak skills get reviewed more often', () => {
  const attempts = [
    ...Array.from({ length: 10 }, () => log('L1', 'add.easy', true)),
    ...Array.from({ length: 10 }, (_, i) => log('L2', 'sub.regroup', i < 2)),
  ];
  const stats = skillStats(attempts);
  assert.ok(reviewWeight('L2', stats) > reviewWeight('L1', stats) * 4);
  assert.equal(reviewWeight('L9', stats), 0.5, 'unpractised lesson has neutral weight');

  const rng = createRng(42).next;
  const counts = { L1: 0, L2: 0 };
  for (let i = 0; i < 200; i++) {
    for (const p of planSession({ lessonId: 'L3', reviewPool: ['L1', 'L2'], attempts, length: 20, random: rng })) {
      if (p.review) counts[p.lessonId]++;
    }
  }
  assert.ok(counts.L2 > counts.L1 * 3, JSON.stringify(counts));
});

test('in-progress and skipped attempts do not affect weights', () => {
  const stats = skillStats([{ ...log('L1', 's', false), outcome: 'in_progress' }, { ...log('L1', 's', false), outcome: 'skipped' }]);
  assert.equal(stats.bySkill.size, 0);
});

test('pickWeighted follows the weights', () => {
  assert.equal(pickWeighted(['a', 'b'], [0, 1], () => 0.99), 'b');
  assert.equal(pickWeighted(['a', 'b'], [1, 0], () => 0.99), 'a');
});
