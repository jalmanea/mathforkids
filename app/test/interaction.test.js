import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadCurriculum, listLessons, difficultiesOf, generateExercise, startAttempt, recordResponse } from '../../src/index.js';
import { interactionFor, applyInteraction, interactionValue, solutionState, moveHand, pickHand, clockValue, payTray, seeded, SYMMETRY_LINES } from '../src/game/interaction.js';

const curriculum = await loadCurriculum();

/** Every (exercise, interaction) pair over a sample of the whole curriculum. */
function* interactive() {
  for (const lesson of listLessons(curriculum)) {
    for (const d of difficultiesOf(lesson)) {
      for (let seed = 1; seed <= 40; seed++) {
        const ex = generateExercise(curriculum, lesson.id, d, { seed });
        const it = interactionFor(ex);
        if (it) yield { ex, it, lesson };
      }
    }
  }
}

test('the solved construction is logged as exactly the right answer', () => {
  const kinds = new Set();
  for (const { ex, it, lesson } of interactive()) {
    kinds.add(it.kind);
    const shown = applyInteraction(ex, it);
    assert.equal(shown.answer, ex.answer);
    assert.equal(shown.data.interaction, it.kind);
    const value = interactionValue(it, solutionState(it), ex.answer);
    const log = recordResponse(startAttempt({ exercise: shown, lesson, sessionId: 's' }), value);
    assert.equal(log.outcome, 'correct', `${lesson.id} ${it.kind}: ${value} vs ${ex.answer}`);
  }
  assert.deepEqual([...kinds].sort(), ['order', 'pay', 'set_clock', 'shade', 'symmetry']);
});

test('a wrong construction is never logged as correct', () => {
  for (const { ex, it } of interactive()) {
    const wrong = {
      order: () => [...it.solution].reverse(),
      set_clock: () => ({ hour: (it.target.hour % 12) + 1, minute: it.target.minute }),
      pay: () => [...it.solution, it.solution[0]],
      symmetry: () => it.lines.filter((l) => !l.axis).map((l) => l.id).slice(0, it.lines.filter((l) => l.axis).length),
      shade: () => (it.target === it.parts ? it.target - 1 : it.target + 1),
    }[it.kind]();
    assert.notEqual(interactionValue(it, wrong, ex.answer), ex.answer, `${ex.lesson_id} ${it.kind}`);
  }
});

test('ordering starts unsolved and uses the prompt items', () => {
  for (const { ex, it } of interactive()) {
    if (it.kind !== 'order') continue;
    assert.notDeepEqual(it.items, it.solution);
    assert.deepEqual([...it.items].sort(), [...it.solution].sort());
    assert.ok(!it.prompt.includes(it.items[0]), 'the items are not repeated in the prompt text');
  }
});

test('pay tray always contains the exact amount, plus extras', () => {
  for (const { it } of interactive()) {
    if (it.kind !== 'pay') continue;
    const left = [...it.tray];
    for (const v of it.solution) {
      const i = left.indexOf(v);
      assert.ok(i >= 0);
      left.splice(i, 1);
    }
    assert.equal(left.length, 3);
    assert.equal(it.solution.reduce((a, b) => a + b, 0), it.total);
  }
  assert.deepEqual(payTray([5, 2], seeded(3)), payTray([5, 2], seeded(3)), 'deterministic for a seed');
});

test('symmetry: right count with wrong lines is still wrong; every shape has its true number of axes', () => {
  const axes = { مربع: 4, مستطيل: 2, 'مثلث متطابق الأضلاع': 3, 'مثلث متطابق الضلعين': 1, قلب: 1 };
  for (const [shape, n] of Object.entries(axes)) assert.equal(SYMMETRY_LINES[shape].filter((l) => l.axis).length, n, shape);
  const it = { kind: 'symmetry', lines: SYMMETRY_LINES['مستطيل'] };
  assert.equal(interactionValue(it, ['h', 'v'], '٢'), '٢');
  assert.notEqual(interactionValue(it, ['d1', 'd2'], '٢'), '٢');
  assert.equal(interactionValue(it, ['v'], '٢'), '١');
});

test('clock hands snap to the lesson step and the hour follows the minutes', () => {
  let t = { hour: 12, minute: 0 };
  t = moveHand(t, 'minute', 92, 15);
  assert.equal(t.minute, 15);
  t = moveHand(t, 'minute', 358, 5);
  assert.equal(t.minute, 0, 'wraps at the top');
  t = moveHand({ hour: 12, minute: 30 }, 'hour', 3 * 30 + 15, 30);
  assert.deepEqual(t, { hour: 3, minute: 30 }, 'half past: the hour hand sits between 3 and 4');
  assert.equal(moveHand({ hour: 5, minute: 0 }, 'hour', 2, 60).hour, 12);
  assert.equal(moveHand({ hour: 5, minute: 0 }, 'minute', 200, 60).minute, 0, 'hour-only lessons keep the minute hand at 12');
  assert.equal(clockValue({ hour: 3, minute: 15 }, true), 'الساعة الثالثة والربع');
  assert.equal(clockValue({ hour: 3, minute: 45 }, true), 'الساعة الرابعة إلا الربع');
  assert.equal(clockValue({ hour: 3, minute: 20 }, true), '٣:٢٠', 'no word form: falls back to digits');
  assert.equal(clockValue({ hour: 3, minute: 5 }, false), '٣:٠٥');
});

test('grabbing a clock hand: by angle when the hands are apart, by distance from the centre when they overlap', () => {
  const start = { hour: 12, minute: 0 };
  assert.equal(pickHand(start, 0, 0.35, 15), 'hour', 'both at 12: near the centre is the short hand');
  assert.equal(pickHand(start, 0, 0.8, 15), 'minute', 'both at 12: near the rim is the long hand');
  assert.equal(pickHand({ hour: 3, minute: 30 }, 100, 0.8, 30), 'hour', 'apart: nearest hand wins even at the rim');
  assert.equal(pickHand({ hour: 3, minute: 30 }, 185, 0.3, 30), 'minute');
  assert.equal(pickHand(start, 200, 0.9, 60), 'hour', 'hour-only lessons never move the long hand');
});
