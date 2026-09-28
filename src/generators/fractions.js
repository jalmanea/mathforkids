// Fractions: parts of a whole, fractions equal to one, comparing, parts of a set, equivalence.
//
// Display convention: Saudi textbooks write fractions stacked (numerator over
// denominator). Exercises with fraction answers set `display: 'fraction'` and
// carry structured {num, den} in data.choice_values / data.answer_value, so the
// UI can render them stacked. The plain-text fallback ("٣/٤") is wrapped in a
// left-to-right isolate so the numerator/denominator order never flips inside RTL text.
import { n } from '../core/digits.js';
import { makeExercise } from '../core/exercise.js';
import { numericMC, stringMC, sampleUntil } from './common.js';

const LRI = '⁦';
const PDI = '⁩';
export const fracText = (num, den) => `${LRI}${n(num)}/${n(den)}${PDI}`;

/** Multiple choice over fractions, keeping structured values alongside the text. */
function fractionMC(ctx, { answer, wrong, data, ...rest }) {
  const key = ([a, b]) => `${a}/${b}`;
  const seen = new Set([key(answer)]);
  const picked = [];
  for (const w of wrong) {
    if (picked.length === 3) break;
    if (w[0] >= 0 && w[1] > 0 && !seen.has(key(w))) {
      seen.add(key(w));
      picked.push(w);
    }
  }
  const all = ctx.rng.shuffle([answer, ...picked]);
  return makeExercise({
    lesson: ctx.lesson,
    difficulty: ctx.difficulty,
    rng: ctx.rng,
    answer: fracText(...answer),
    choices: all.map((f) => fracText(...f)),
    data: {
      ...data,
      display: 'fraction',
      answer_value: { num: answer[0], den: answer[1] },
      choice_values: all.map(([num, den]) => ({ num, den })),
    },
    ...rest,
  });
}

/**
 * Fraction of a whole shape.
 * params: { denominators:number[], numerators:'unit'|'any', models:('circle'|'rect'|'strip')[] }
 */
function partOfWhole(ctx) {
  const { rng, params } = ctx;
  const den = rng.pick(params.denominators);
  const num = params.numerators === 'unit' ? 1 : rng.int(1, den - 1);
  return fractionMC(ctx, {
    skill: `frac.whole.${params.numerators}`,
    type: 'visual',
    prompt: 'ما الكسر الذي يدل على الجزء الملوَّن؟',
    answer: [num, den],
    wrong: [[den - num, den], [den, num], [num, den + 1], [num, den - 1], [num + 1, den], [1, num + den]],
    visual: { kind: 'fraction_model', model: rng.pick(params.models), parts: den, shaded: num },
    data: { num, den },
  });
}

/**
 * Fractions equal to one.
 * params: { denominators:number[] }
 */
function equalToOne(ctx) {
  const { rng, params } = ctx;
  const den = rng.pick(params.denominators);
  if (rng.bool()) {
    return fractionMC(ctx, {
      skill: 'frac.equal_one.pick',
      type: 'visual',
      prompt: 'أي كسر يساوي الواحد؟',
      answer: [den, den],
      wrong: [[den - 1, den], [1, den], [den - 2, den], [1, den + 1]],
      visual: { kind: 'fraction_model', model: 'rect', parts: den, shaded: den },
      data: { num: den, den },
    });
  }
  return numericMC(ctx, {
    skill: 'frac.equal_one.missing',
    type: 'fill_blank',
    prompt: `${LRI}؟/${n(den)}${PDI} = ${n(1)}`,
    answer: den,
    mistakes: [1, den - 1, den + 1, 0],
    data: { den, answer_value: den },
  });
}

/** Two fractions of the requested kind: unit fractions, same denominator, or related denominators (d and d×k). */
function fractionPair(rng, denominators, mode) {
  if (mode === 'unit') {
    const [d1, d2] = rng.bool(0.15) ? Array(2).fill(rng.pick(denominators)) : rng.sample(denominators, 2);
    return [[1, d1], [1, d2]];
  }
  if (mode === 'same_den') {
    const den = rng.pick(denominators.filter((d) => d >= 3));
    const [x, y] = rng.bool(0.15) ? Array(2).fill(rng.int(1, den - 1)) : rng.sample([...Array(den - 1).keys()].map((i) => i + 1), 2);
    return [[x, den], [y, den]];
  }
  // related: e.g. 3/4 vs 7/8 — both denominators in the list, one a multiple of the other
  const pairs = [];
  for (const d of denominators) for (const e of denominators) if (e > d && e % d === 0) pairs.push([d, e]);
  const [d, e] = rng.pick(pairs);
  const pair = [[rng.int(1, d - 1), d], [rng.int(1, e - 1), e]];
  return rng.bool() ? pair : pair.reverse();
}

/**
 * Compare two fractions.
 * params: { denominators:number[], modes:('unit'|'same_den'|'related')[] }
 *   grade 2 (8-5) compares unit fractions only; grade 3 (11-5) same and related denominators.
 */
function compare(ctx) {
  const { rng, params } = ctx;
  const mode = rng.pick(params.modes);
  const [a, b] = fractionPair(rng, params.denominators, mode);
  const va = a[0] / a[1];
  const vb = b[0] / b[1];
  const sym = va > vb ? '>' : va < vb ? '<' : '=';
  return stringMC(ctx, {
    skill: `frac.compare.${mode}`,
    type: 'comparison',
    prompt: `اختر الرمز المناسب: ${fracText(...a)} ○ ${fracText(...b)}`,
    answer: sym,
    wrong: ['>', '<', '='],
    count: 3,
    visual: {
      kind: 'fraction_compare',
      left: { kind: 'fraction_model', model: 'strip', parts: a[1], shaded: a[0] },
      right: { kind: 'fraction_model', model: 'strip', parts: b[1], shaded: b[0] },
    },
    data: { a: { num: a[0], den: a[1] }, b: { num: b[0], den: b[1] }, answer_value: sym },
  });
}

/**
 * Fractions as parts of a set.
 * params: { denominators:number[], ask:('fraction'|'count')[], groups?:[min,max] }
 *   fraction: k of n objects are coloured -> k/n (n is a denominator)
 *   count:    num/den of a set of size den*g -> how many?
 */
function ofSet(ctx) {
  const { rng, params } = ctx;
  const ask = rng.pick(params.ask);
  const den = rng.pick(params.denominators);
  if (ask === 'fraction') {
    const k = rng.int(1, den - 1);
    return fractionMC(ctx, {
      skill: 'frac.set.fraction',
      type: 'visual',
      prompt: 'ما الكسر الذي يدل على الكرات الحمراء في المجموعة؟',
      answer: [k, den],
      wrong: [[den - k, den], [den, k], [k, den - k], [k, den + 1]],
      visual: { kind: 'set_model', object: 'ball', total: den, highlighted: k },
      data: { num: k, den },
    });
  }
  const g = rng.int(...(params.groups ?? [2, 5]));
  const num = rng.int(1, den - 1);
  const total = den * g;
  const ans = num * g;
  return numericMC(ctx, {
    skill: 'frac.set.count',
    type: 'visual',
    prompt: `كم يساوي ${fracText(num, den)} من ${n(total)}؟`,
    answer: ans,
    mistakes: [g, total - ans, ans + g, total / num === Math.floor(total / num) ? total / num : ans + 1],
    choiceOpts: { min: 1 },
    visual: { kind: 'set_model', object: 'ball', total, groups: den, highlighted: ans },
    data: { num, den, total, answer_value: ans },
  });
}

/**
 * Equivalent fractions a/b = (a·k)/(b·k) with one blank.
 * params: { denominators:number[], max_den:number, blanks?:('right_num'|'left_num'|'right_den')[] }
 *   right_num: ١/٢ = ؟/٤    left_num: ؟/٥ = ٤/١٠    right_den: ٣/٤ = ٦/؟   (all appear in 11-3)
 */
function equivalent(ctx) {
  const { rng, params } = ctx;
  const { a, b, k } = sampleUntil(
    () => {
      const b = rng.pick(params.denominators);
      return { a: rng.int(1, b - 1), b, k: rng.int(2, 4) };
    },
    ({ b, k }) => b * k <= params.max_den,
  );
  const blank = rng.pick(params.blanks ?? ['right_num']);
  const f = (x, y) => `${LRI}${x}/${y}${PDI}`;
  const spec = {
    right_num: { prompt: `${fracText(a, b)} = ${f('؟', n(b * k))}`, ans: a * k, mistakes: [a, a + k, b * k - a, a * k + 1], max: b * k - 1 },
    left_num: { prompt: `${f('؟', n(b))} = ${fracText(a * k, b * k)}`, ans: a, mistakes: [a * k, a + 1, b - a, a * 2], max: b * k },
    right_den: { prompt: `${fracText(a, b)} = ${f(n(a * k), '؟')}`, ans: b * k, mistakes: [b, b + k, b * k + 1, a * k + b], max: 100 },
  }[blank];
  const ans = spec.ans;
  return numericMC(ctx, {
    skill: `frac.equivalent.${blank}`,
    type: 'fill_blank',
    prompt: spec.prompt,
    answer: ans,
    mistakes: spec.mistakes,
    choiceOpts: { min: 1, max: spec.max },
    visual: {
      kind: 'fraction_compare',
      left: { kind: 'fraction_model', model: 'strip', parts: b, shaded: blank === 'left_num' ? null : a },
      // hide whatever the blank asks for so the picture doesn't give the answer away
      right: { kind: 'fraction_model', model: 'strip', parts: blank === 'right_den' ? null : b * k, shaded: blank === 'right_num' ? null : a * k },
    },
    data: { left: { num: a, den: b }, right: { num: a * k, den: b * k }, blank, answer_value: ans },
  });
}

/**
 * Order three fractions (11-5): same denominator, or denominators related by multiples.
 * params: { denominators:number[], modes:('same_den'|'related')[] }
 */
function order(ctx) {
  const { rng, params } = ctx;
  const mode = rng.pick(params.modes);
  const fr = sampleUntil(
    () => {
      if (mode === 'same_den') {
        const den = rng.pick(params.denominators.filter((d) => d >= 4));
        return rng.sample([...Array(den - 1).keys()].map((i) => i + 1), 3).map((x) => [x, den]);
      }
      const dens = params.denominators;
      const base = rng.pick(dens.filter((d) => dens.some((e) => e > d && e % d === 0)));
      const pool = dens.filter((e) => e % base === 0);
      return [0, 1, 2].map(() => {
        const d = rng.pick(pool);
        return [rng.int(1, d - 1), d];
      });
    },
    (arr) => new Set(arr.map(([x, y]) => x / y)).size === 3,
  );
  const asc = rng.bool();
  const sorted = [...fr].sort((p, q) => (asc ? p[0] / p[1] - q[0] / q[1] : q[0] / q[1] - p[0] / p[1]));
  const fmt = (arr) => arr.map((f) => fracText(...f)).join('، ');
  const perms = [[0, 2, 1], [1, 0, 2], [2, 1, 0], [1, 2, 0], [2, 0, 1]].map((pm) => pm.map((i) => sorted[i]));
  return stringMC(ctx, {
    skill: `frac.order.${mode}`,
    type: 'ordering',
    prompt: `رتّب الكسور ${asc ? 'من الأصغر إلى الأكبر' : 'من الأكبر إلى الأصغر'}: ${fmt(fr)}`,
    answer: fmt(sorted),
    wrong: rng.shuffle(perms).map(fmt),
    visual: { kind: 'fraction_list', items: fr.map(([num, den]) => ({ kind: 'fraction_model', model: 'strip', parts: den, shaded: num })) },
    data: {
      display: 'fraction_list',
      fractions: fr.map(([num, den]) => ({ num, den })),
      direction: asc ? 'asc' : 'desc',
      answer_value: sorted.map(([num, den]) => ({ num, den })),
    },
  });
}

export default {
  'frac.order': order,
  'frac.part_of_whole': partOfWhole,
  'frac.equal_one': equalToOne,
  'frac.compare': compare,
  'frac.of_set': ofSet,
  'frac.equivalent': equivalent,
};
