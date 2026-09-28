// Subtraction: strategies, zero/all, related facts, missing numbers, column subtraction, checking, estimation.
import { n } from '../core/digits.js';
import { subtractSmallerFromLarger } from '../core/choices.js';
import { numericMC, stringMC, sampleUntil, needsBorrow, regroupOk } from './common.js';
import { roundTo } from './numbers.js';

/**
 * Basic facts by strategy.
 * params: { mode: 'count_back' | 'zero_all' | 'doubles' | 'any', max_minuend?: number }
 */
function facts(ctx) {
  const { rng, params } = ctx;
  const maxM = params.max_minuend ?? 18;
  let a, b;
  if (params.mode === 'count_back') {
    b = rng.int(1, 3);
    a = rng.int(b + 1, maxM);
  } else if (params.mode === 'zero_all') {
    a = rng.int(1, maxM);
    b = rng.bool() ? 0 : a;
  } else if (params.mode === 'doubles') {
    b = rng.int(1, Math.floor(maxM / 2));
    a = 2 * b;
  } else {
    a = rng.int(0, maxM);
    b = rng.int(0, a);
  }
  const d = a - b;
  return numericMC(ctx, {
    skill: `sub.facts.${params.mode}`,
    prompt: `${n(a)} - ${n(b)} = ؟`,
    answer: d,
    mistakes: [d + 1, d - 1, a + b, params.mode === 'zero_all' ? (b === 0 ? 0 : a) : d + 2],
    data: { op: 'sub', operands: [a, b], answer_value: d },
  });
}

/**
 * Relationship between addition and subtraction / related facts (fact families).
 * params: { max_sum: number }
 */
function related(ctx) {
  const { rng, params } = ctx;
  const [a, b] = sampleUntil(() => [rng.int(1, 9), rng.int(1, 9)], ([x, y]) => x + y <= params.max_sum);
  const s = a + b;
  const askFirst = rng.bool();
  const ans = askFirst ? a : b;
  return numericMC(ctx, {
    skill: 'sub.related_facts',
    type: 'fill_blank',
    prompt: `${n(a)} + ${n(b)} = ${n(s)}، إذن ${n(s)} - ${n(askFirst ? b : a)} = ؟`,
    answer: ans,
    mistakes: [askFirst ? b : a, s, ans + 1, ans - 1],
    data: { op: 'sub', operands: [s, askFirst ? b : a], family: [a, b, s], answer_value: ans },
  });
}

/**
 * Missing numbers in addition/subtraction sentences.
 * params: { max: number }  (largest number in the sentence)
 */
function missing(ctx) {
  const { rng, params } = ctx;
  const s = rng.int(2, params.max);
  const a = rng.int(1, s - 1);
  const b = s - a;
  const form = rng.pick(['add_second', 'sub_second', 'sub_first']);
  const spec = {
    add_second: { prompt: `${n(a)} + ؟ = ${n(s)}`, ans: b, operands: [a, b] },
    sub_second: { prompt: `${n(s)} - ؟ = ${n(b)}`, ans: a, operands: [s, a] },
    sub_first: { prompt: `؟ - ${n(a)} = ${n(b)}`, ans: s, operands: [s, a] },
  }[form];
  return numericMC(ctx, {
    skill: `sub.missing.${form}`,
    type: 'fill_blank',
    prompt: spec.prompt,
    answer: spec.ans,
    mistakes: [s + a, spec.ans + 1, spec.ans - 1, form === 'sub_first' ? b : s],
    data: { form, sentence: { a, b, s }, operands: spec.operands, answer_value: spec.ans },
  });
}

/**
 * Column subtraction.
 * params: {
 *   a:[min,max] (minuend), b:[min,max] (subtrahend),
 *   regroup: 'none' | 'required' | 'any',
 *   regroup_place?: 'tens' | 'hundreds' — for 3-digit: which borrow is required
 *   multiple_of?: number, zeros?: boolean — minuend has a 0 in the tens place
 *   b_values?: number[] — subtrahend drawn from this set (e.g. counting back by 1s and 10s)
 * }
 */
function column(ctx) {
  const { rng, params } = ctx;
  const m = params.multiple_of ?? 1;
  const drawIn = ([lo, hi]) => rng.int(Math.ceil(lo / m), Math.floor(hi / m)) * m;
  const [a, b] = sampleUntil(
    () => [drawIn(params.a), params.b_values ? rng.pick(params.b_values) : drawIn(params.b)],
    ([x, y]) =>
      x > y &&
      regroupOk(params.regroup, needsBorrow(x, y)) &&
      borrowPlaceOk(params.regroup_place, x, y) &&
      (!params.zeros || Math.floor(x / 10) % 10 === 0),
  );
  const d = a - b;
  return numericMC(ctx, {
    skill: `sub.column.${needsBorrow(a, b) ? 'regroup' : 'no_regroup'}`,
    prompt: `${n(a)} - ${n(b)} = ؟`,
    answer: d,
    mistakes: [subtractSmallerFromLarger(a, b), d + 10, d - 10, d + 1, d - 1, d + 100],
    data: { op: 'sub', operands: [a, b], answer_value: d, regrouped: needsBorrow(a, b) },
  });
}

function borrowPlaceOk(place, a, b) {
  if (!place) return true;
  const onesBorrow = a % 10 < b % 10;
  const tensA = (Math.floor(a / 10) % 10) - (onesBorrow ? 1 : 0);
  const tensBorrow = tensA < Math.floor(b / 10) % 10;
  // "regroup tens" = borrow a ten into the ones; "regroup hundreds" = borrow a hundred into the tens
  if (place === 'tens') return onesBorrow && !tensBorrow;
  if (place === 'hundreds') return tensBorrow && !onesBorrow;
  return true;
}

/**
 * Checking a subtraction with addition (which addition sentence checks it?).
 * params: { a:[min,max], b:[min,max] }
 */
function check(ctx) {
  const { rng, params } = ctx;
  const [a, b] = sampleUntil(() => [rng.int(...params.a), rng.int(...params.b)], ([x, y]) => x > y);
  const d = a - b;
  const right = `${n(d)} + ${n(b)} = ${n(a)}`;
  return stringMC(ctx, {
    skill: 'sub.check_with_addition',
    type: 'multiple_choice',
    // question first, sentence last: a "؟" right after the equation would read like a blank
    prompt: `أي جملة جمع نتحقق بها من صحة الطرح الآتي؟ ${n(a)} - ${n(b)} = ${n(d)}`,
    answer: right,
    wrong: [`${n(a)} + ${n(b)} = ${n(a + b)}`, `${n(d)} + ${n(a)} = ${n(a + d)}`, `${n(d)} + ${n(b)} = ${n(a + 10)}`],
    data: { op: 'sub', operands: [a, b], answer_value: right, check: [d, b, a] },
  });
}

/** Estimate a difference by rounding. params: { a:[min,max], b:[min,max], to: 10|100 } */
function estimate(ctx) {
  const { rng, params } = ctx;
  const to = params.to;
  const [a, b] = sampleUntil(
    () => [rng.int(...params.a), rng.int(...params.b)],
    ([x, y]) => roundTo(x, to) > roundTo(y, to) && x % to !== 0 && y % to !== 0 && roundTo(x, to) - roundTo(y, to) !== x - y,
  );
  const est = roundTo(a, to) - roundTo(b, to);
  const word = to === 10 ? 'عشرة' : 'مئة';
  return numericMC(ctx, {
    skill: `sub.estimate.${to}`,
    prompt: `قدّر ناتج الطرح بتقريب كل عدد إلى أقرب ${word}: ${n(a)} - ${n(b)}`,
    answer: est,
    mistakes: [a - b, est + to, est - to, roundTo(a, to) + roundTo(b, to)],
    choiceOpts: { min: 0 },
    data: { op: 'sub', operands: [a, b], to, rounded: [roundTo(a, to), roundTo(b, to)], answer_value: est },
  });
}

export default {
  'sub.facts': facts,
  'sub.related': related,
  'sub.missing': missing,
  'sub.column': column,
  'sub.check': check,
  'sub.estimate': estimate,
};
