// Division (grade 3): sharing, repeated subtraction, relation to multiplication, facts, 0 and 1.
import { n } from '../core/digits.js';
import { countNoun, NOUNS, THING_KEYS } from '../core/arabic.js';
import { numericMC } from './common.js';

const divMistakes = (q, d, total) => [q + 1, q - 1, d, total - d, q * 2];

/** Equal sharing with a model. params: { divisors:number[], quotient:[min,max] } */
function sharing(ctx) {
  const { rng, params } = ctx;
  const d = rng.pick(params.divisors);
  const q = rng.int(...params.quotient);
  const total = d * q;
  const noun = NOUNS[rng.pick(THING_KEYS)];
  return numericMC(ctx, {
    skill: 'div.sharing',
    type: 'visual',
    prompt: `${noun.g === 'f' ? 'وُزِّعت' : 'وُزِّع'} ${countNoun(total, noun)} بالتساوي على ${countNoun(d, NOUNS.plate, 'gen')}. كم ${noun.many} في كل طبق؟`,
    answer: q,
    mistakes: divMistakes(q, d, total),
    choiceOpts: { min: 0 },
    visual: { kind: 'equal_groups', groups: d, size: q, mode: 'share' },
    data: { op: 'div', dividend: total, divisor: d, answer_value: q },
  });
}

/** Division as repeated subtraction. params: { divisors:number[], quotient:[min,max] } */
function repeatedSubtraction(ctx) {
  const { rng, params } = ctx;
  const d = rng.pick(params.divisors);
  const q = rng.int(...params.quotient);
  const total = d * q;
  const chain = [n(total), ...Array(q).fill(n(d))].join(' - ');
  return numericMC(ctx, {
    skill: 'div.repeated_subtraction',
    type: 'fill_blank',
    prompt: `${chain} = ${n(0)}، إذن ${n(total)} ÷ ${n(d)} = ؟`,
    answer: q,
    mistakes: divMistakes(q, d, total),
    choiceOpts: { min: 0 },
    data: { op: 'div', dividend: total, divisor: d, answer_value: q },
  });
}

/** Relation to multiplication (fact families). params: { divisors:number[], quotient:[min,max] } */
function factFamily(ctx) {
  const { rng, params } = ctx;
  const d = rng.pick(params.divisors);
  const q = rng.int(...params.quotient);
  const total = d * q;
  return numericMC(ctx, {
    skill: 'div.fact_family',
    type: 'fill_blank',
    prompt: `${n(q)} × ${n(d)} = ${n(total)}، إذن ${n(total)} ÷ ${n(d)} = ؟`,
    answer: q,
    mistakes: divMistakes(q, d, total),
    choiceOpts: { min: 0 },
    data: { op: 'div', dividend: total, divisor: d, answer_value: q },
  });
}

/**
 * Facts for given divisors.
 * params: { divisors:number[], quotient:[min,max], missing_rate?:number }
 */
function facts(ctx) {
  const { rng, params } = ctx;
  const d = rng.pick(params.divisors);
  const q = rng.int(...params.quotient);
  const total = d * q;
  if (params.missing_rate && rng.bool(params.missing_rate)) {
    return numericMC(ctx, {
      skill: `div.facts.${d}.missing_dividend`,
      type: 'fill_blank',
      prompt: `؟ ÷ ${n(d)} = ${n(q)}`,
      answer: total,
      mistakes: [total + d, total - d, d + q, q],
      choiceOpts: { min: 0 },
      data: { op: 'div', dividend: total, divisor: d, form: 'missing_dividend', answer_value: total },
    });
  }
  return numericMC(ctx, {
    skill: `div.facts.${d}`,
    prompt: `${n(total)} ÷ ${n(d)} = ؟`,
    answer: q,
    mistakes: divMistakes(q, d, total),
    choiceOpts: { min: 0 },
    data: { op: 'div', dividend: total, divisor: d, answer_value: q },
  });
}

/** Division rules with 0 and 1. params: { range:[min,max] } — never divides by zero. */
function zeroOne(ctx) {
  const { rng, params } = ctx;
  const x = rng.int(...params.range);
  const form = rng.pick(['by_one', 'zero_by', 'self']);
  const [total, d] = { by_one: [x, 1], zero_by: [0, x], self: [x, x] }[form];
  const q = total / d;
  return numericMC(ctx, {
    skill: `div.zero_one.${form}`,
    prompt: `${n(total)} ÷ ${n(d)} = ؟`,
    answer: q,
    mistakes: [0, 1, x, x + 1],
    choiceOpts: { min: 0 },
    data: { op: 'div', dividend: total, divisor: d, answer_value: q },
  });
}

export default {
  'div.sharing': sharing,
  'div.repeated_subtraction': repeatedSubtraction,
  'div.fact_family': factFamily,
  'div.facts': facts,
  'div.zero_one': zeroOne,
};
