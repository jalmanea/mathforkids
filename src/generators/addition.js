// Addition: single-digit strategies, properties, three addends, column addition, estimation.
import { n } from '../core/digits.js';
import { addWithoutCarry, reverseDigits } from '../core/choices.js';
import { numericMC, stringMC, sampleUntil, needsCarry, regroupOk } from './common.js';
import { roundTo } from './numbers.js';

/**
 * Basic facts taught through a specific strategy.
 * params: { mode: 'count_on' | 'doubles' | 'near_doubles' | 'make_ten' | 'any', max_addend?: number, max_sum?: number }
 */
function facts(ctx) {
  const { rng, params } = ctx;
  const maxA = params.max_addend ?? 9;
  const maxSum = params.max_sum ?? 18;
  const draw = {
    count_on: () => [rng.int(2, maxA), rng.int(1, 3)],
    doubles: () => {
      const x = rng.int(1, maxA);
      return [x, x];
    },
    near_doubles: () => {
      const x = rng.int(1, maxA - 1);
      return [x, x + 1];
    },
    make_ten: () => [rng.int(7, 9), rng.int(2, 9)],
    any: () => [rng.int(0, maxA), rng.int(0, maxA)],
  }[params.mode];
  const [a0, b0] = sampleUntil(draw, ([x, y]) => x + y <= maxSum && (params.mode !== 'make_ten' || x + y > 10));
  const [a, b] = params.mode === 'count_on' || params.mode === 'make_ten' || rng.bool() ? [a0, b0] : [b0, a0];
  const sum = a + b;

  // make-ten also asks for the intermediate step sometimes: 8 + 5 = 10 + ?
  if (params.mode === 'make_ten' && params.show_step && rng.bool()) {
    const big = Math.max(a, b);
    const rest = sum - 10;
    return numericMC(ctx, {
      skill: 'add.make_ten.step',
      type: 'fill_blank',
      prompt: `${n(a)} + ${n(b)} = ${n(10)} + ؟`,
      answer: rest,
      mistakes: [rest + 1, rest - 1, 10 - big, sum],
      data: { op: 'add', operands: [a, b], form: 'make_ten_step', answer_value: rest },
    });
  }
  return numericMC(ctx, {
    skill: `add.facts.${params.mode}`,
    prompt: `${n(a)} + ${n(b)} = ؟`,
    answer: sum,
    mistakes: [sum + 1, sum - 1, Math.abs(a - b), sum + 10 > 20 ? sum - 2 : sum + 2],
    data: { op: 'add', operands: [a, b], answer_value: sum },
  });
}

/**
 * Properties of addition.
 * params: { properties: ('commutative'|'identity'|'associative')[], range:[min,max], ask?: ('fill'|'name')[] }
 */
function properties(ctx) {
  const { rng, params } = ctx;
  const prop = rng.pick(params.properties);
  const [lo, hi] = params.range;
  if (rng.pick(params.ask ?? ['fill']) === 'name') return nameProperty(ctx, prop);
  if (prop === 'identity') {
    const a = rng.int(Math.max(lo, 1), hi);
    const zeroFirst = rng.bool();
    return numericMC(ctx, {
      skill: 'add.property.identity',
      type: 'fill_blank',
      prompt: zeroFirst ? `${n(0)} + ${n(a)} = ؟` : `${n(a)} + ${n(0)} = ؟`,
      answer: a,
      mistakes: [0, a + 1, a - 1, a * 10],
      data: { op: 'add', operands: zeroFirst ? [0, a] : [a, 0], property: prop, answer_value: a },
    });
  }
  if (prop === 'commutative') {
    const a = rng.int(lo, hi);
    const b = sampleUntil(() => rng.int(lo, hi), (x) => x !== a);
    return numericMC(ctx, {
      skill: 'add.property.commutative',
      type: 'fill_blank',
      prompt: `${n(a)} + ${n(b)} = ${n(b)} + ؟`,
      answer: a,
      mistakes: [b, a + b, a + 1, a - 1],
      data: { op: 'add', operands: [a, b], property: prop, answer_value: a },
    });
  }
  // associative: (a + b) + c = a + (b + ?)
  const [a, b, c] = [rng.int(lo, hi), rng.int(lo, hi), rng.int(lo, hi)];
  return numericMC(ctx, {
    skill: 'add.property.associative',
    type: 'fill_blank',
    prompt: `(${n(a)} + ${n(b)}) + ${n(c)} = ${n(a)} + (${n(b)} + ؟)`,
    answer: c,
    mistakes: [a, b, a + b, b + c],
    data: { op: 'add', operands: [a, b, c], property: prop, answer_value: c },
  });
}

// Names as printed in grade 3 (2-1).
const PROPERTY_NAMES = { commutative: 'خاصية الإبدال', identity: 'خاصية العنصر المحايد', associative: 'خاصية التجميع' };

/** "Which property is used?" — a true sentence, pick the property name. */
function nameProperty(ctx, prop) {
  const { rng, params } = ctx;
  const [lo, hi] = params.range;
  const [a, b, c] = sampleUntil(() => [rng.int(lo, hi), rng.int(lo, hi), rng.int(lo, hi)], ([x, y]) => x !== y);
  const sentence = {
    commutative: `${n(a)} + ${n(b)} = ${n(b)} + ${n(a)}`,
    identity: `${n(a)} + ${n(0)} = ${n(a)}`,
    associative: `(${n(a)} + ${n(b)}) + ${n(c)} = ${n(a)} + (${n(b)} + ${n(c)})`,
  }[prop];
  return stringMC(ctx, {
    skill: `add.property.${prop}.name`,
    type: 'multiple_choice',
    prompt: `ما الخاصية المستعملة في: ${sentence}`,
    answer: PROPERTY_NAMES[prop],
    wrong: Object.values(PROPERTY_NAMES).filter((x) => x !== PROPERTY_NAMES[prop]),
    count: 3,
    data: { property: prop, operands: prop === 'identity' ? [a, 0] : prop === 'commutative' ? [a, b] : [a, b, c], answer_value: PROPERTY_NAMES[prop] },
  });
}

/**
 * Adding three numbers.
 * params: { range:[min,max], max_sum?: number, regroup?: 'none'|'required'|'any' }
 */
function three(ctx) {
  const { rng, params } = ctx;
  const [lo, hi] = params.range;
  const ops = sampleUntil(
    () => [rng.int(lo, hi), rng.int(lo, hi), rng.int(lo, hi)],
    (o) => o[0] + o[1] + o[2] <= (params.max_sum ?? Infinity) && regroupOk(params.regroup ?? 'any', onesSum(o) >= 10),
  );
  const sum = ops[0] + ops[1] + ops[2];
  return numericMC(ctx, {
    skill: 'add.three_addends',
    prompt: `${ops.map(n).join(' + ')} = ؟`,
    answer: sum,
    mistakes: [sum - ops[2], sum + 1, sum - 1, sum + 10, sum - 10],
    data: { op: 'add', operands: ops, answer_value: sum },
  });
}
const onesSum = (ops) => ops.reduce((s, x) => s + (x % 10), 0);

/**
 * Column addition of multi-digit numbers.
 * params: {
 *   a:[min,max], b:[min,max],
 *   regroup: 'none' | 'required' | 'any',
 *   regroup_place?: 'ones' | 'tens' | 'both' — which column must carry (when regroup='required')
 *   multiple_of?: number — both addends multiples of this (e.g. 10 for "adding tens")
 *   b_values?: number[] — second addend drawn from this set instead of b (e.g. [1,2,3,10,20,30] for counting on)
 *   max_sum?: number,
 *   missing_rate?: number — probability of asking for a missing addend instead
 * }
 */
function column(ctx) {
  const { rng, params } = ctx;
  const m = params.multiple_of ?? 1;
  const drawIn = ([lo, hi]) => rng.int(Math.ceil(lo / m), Math.floor(hi / m)) * m;
  const drawB = () => (params.b_values ? rng.pick(params.b_values) : drawIn(params.b));
  const [a, b] = sampleUntil(
    () => (params.b_values || rng.bool() ? [drawIn(params.a), drawB()] : [drawB(), drawIn(params.a)]),
    ([x, y]) =>
      x + y <= (params.max_sum ?? Infinity) &&
      regroupOk(params.regroup, needsCarry(x, y)) &&
      carryPlaceOk(params.regroup_place, x, y),
  );
  const sum = a + b;
  const common = [addWithoutCarry(a, b), sum + 10, sum - 10, sum + 1, sum - 1];
  if (sum < 100) common.push(reverseDigits(sum));

  if (params.missing_rate && rng.bool(params.missing_rate)) {
    return numericMC(ctx, {
      skill: 'add.missing_addend',
      type: 'fill_blank',
      prompt: `${n(a)} + ؟ = ${n(sum)}`,
      answer: b,
      mistakes: [sum + a, b + 10, b - 10, b + 1, b - 1],
      data: { op: 'add', operands: [a, b], form: 'missing_second', answer_value: b, regrouped: needsCarry(a, b) },
    });
  }
  return numericMC(ctx, {
    skill: `add.column.${needsCarry(a, b) ? 'regroup' : 'no_regroup'}`,
    prompt: `${n(a)} + ${n(b)} = ؟`,
    answer: sum,
    mistakes: common,
    data: { op: 'add', operands: [a, b], answer_value: sum, regrouped: needsCarry(a, b) },
  });
}

function carryPlaceOk(place, a, b) {
  if (!place) return true;
  const onesCarry = (a % 10) + (b % 10) >= 10;
  const c1 = onesCarry ? 1 : 0;
  const tensCarry = (Math.floor(a / 10) % 10) + (Math.floor(b / 10) % 10) + c1 >= 10;
  if (place === 'ones') return onesCarry && !tensCarry;
  if (place === 'tens') return tensCarry && !onesCarry;
  return onesCarry && tensCarry; // both
}

/**
 * Estimate a sum by rounding each addend first.
 * params: { a:[min,max], b:[min,max], to: 10 | 100, max_sum?: number }
 */
function estimate(ctx) {
  const { rng, params } = ctx;
  const to = params.to;
  const [a, b] = sampleUntil(
    () => [rng.int(...params.a), rng.int(...params.b)],
    ([x, y]) =>
      x % to !== 0 && y % to !== 0 && roundTo(x, to) + roundTo(y, to) !== x + y &&
      roundTo(x, to) + roundTo(y, to) <= (params.max_sum ?? Infinity) && x + y <= (params.max_sum ?? Infinity),
  );
  const est = roundTo(a, to) + roundTo(b, to);
  const word = to === 10 ? 'عشرة' : 'مئة';
  return numericMC(ctx, {
    skill: `add.estimate.${to}`,
    prompt: `قدّر ناتج الجمع بتقريب كل عدد إلى أقرب ${word}: ${n(a)} + ${n(b)}`,
    answer: est,
    mistakes: [a + b, Math.floor(a / to) * to + Math.floor(b / to) * to, est + to, est - to],
    choiceOpts: { min: 0 },
    data: { op: 'add', operands: [a, b], to, rounded: [roundTo(a, to), roundTo(b, to)], answer_value: est },
  });
}

export default {
  'add.facts': facts,
  'add.properties': properties,
  'add.three': three,
  'add.column': column,
  'add.estimate': estimate,
};
