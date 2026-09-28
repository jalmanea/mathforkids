// Number sense: place value, reading/writing, comparing, ordering, rounding, patterns, estimating.
import { n } from '../core/digits.js';
import { numberToWords } from '../core/number-words.js';
import { numericMC, stringMC, sampleUntil } from './common.js';

export const PLACE_NAMES = ['الآحاد', 'العشرات', 'المئات', 'الألوف', 'عشرات الألوف'];
const SEP = '، ';

const digitAt = (x, p) => Math.floor(x / 10 ** p) % 10;
const numDigits = (x) => String(x).length;

/**
 * Place value.
 * params: { range:[min,max], ask:[ 'value' | 'place' | 'from_places' | 'expanded' ], multiple_of?: number }
 */
function placeValue(ctx) {
  const { rng, params } = ctx;
  const [lo, hi] = params.range;
  const ask = rng.pick(params.ask);
  const m = params.multiple_of ?? 1;
  const x = sampleUntil(() => rng.int(Math.ceil(lo / m), Math.floor(hi / m)) * m, (v) => numDigits(v) >= 2);
  const d = numDigits(x);

  if (ask === 'value' || ask === 'place') {
    // Pick a place whose digit is non-zero and appears only once, so the question is unambiguous.
    const digits = String(x).split('');
    const places = [...Array(d).keys()].filter((p) => {
      const dg = digitAt(x, p);
      return dg !== 0 && digits.filter((c) => Number(c) === dg).length === 1;
    });
    if (!places.length) return placeValue(ctx);
    const p = rng.pick(places);
    const dg = digitAt(x, p);
    if (ask === 'value') {
      const val = dg * 10 ** p;
      return numericMC(ctx, {
        skill: 'place_value.digit_value',
        prompt: `ما قيمة الرقم ${n(dg)} في العدد ${n(x)}؟`,
        answer: val,
        mistakes: [dg, dg * 10 ** (p + 1), p > 0 ? dg * 10 ** (p - 1) : dg * 100, x],
        data: { number: x, digit: dg, place: p, answer_value: val },
      });
    }
    return stringMC(ctx, {
      skill: 'place_value.digit_place',
      prompt: `في العدد ${n(x)}، ما منزلة الرقم ${n(dg)}؟`,
      answer: PLACE_NAMES[p],
      wrong: PLACE_NAMES.slice(0, Math.max(d, 3)).filter((_, i) => i !== p),
      data: { number: x, digit: dg, place: p, answer_value: PLACE_NAMES[p] },
    });
  }

  const parts = [...Array(d).keys()].reverse().map((p) => ({ p, digit: digitAt(x, p) }));
  if (ask === 'from_places') {
    const text = parts.map(({ p, digit }) => `${PLACE_NAMES[p]}: ${n(digit)}`).join(SEP);
    const rev = Number(String(x).split('').reverse().join(''));
    return numericMC(ctx, {
      skill: 'place_value.compose',
      prompt: `ما العدد الذي فيه ${text}؟`,
      answer: x,
      mistakes: [rev, x + 10, x - 10, x + 1],
      visual: { kind: 'place_value_chart', places: parts.map(({ p, digit }) => ({ place: p, digit })) },
      data: { number: x, answer_value: x },
    });
  }
  // expanded
  const terms = parts.filter(({ digit }) => digit !== 0).map(({ p, digit }) => digit * 10 ** p);
  if (terms.length < 2 && m === 1) return placeValue(ctx);
  return numericMC(ctx, {
    skill: 'place_value.expanded',
    prompt: `${terms.map(n).join(' + ')} = ؟`,
    answer: x,
    mistakes: [Number(String(x).split('').reverse().join('')), x + 10 ** (d - 1), x - 10, terms.reduce((s, t) => s + String(t).length, 0)],
    data: { terms, answer_value: x },
  });
}

/**
 * Reading and writing numbers (digits <-> Arabic words).
 * params: { range:[min,max] }
 */
function readWrite(ctx) {
  const { rng, params } = ctx;
  const [lo, hi] = params.range;
  const x = rng.int(lo, hi);
  const near = [x + 10, x - 10, x + 1, x - 1, Number(String(x).split('').reverse().join(''))].filter(
    (v) => v >= 0 && v <= 99999 && v !== x,
  );
  if (rng.bool()) {
    return numericMC(ctx, {
      skill: 'numbers.words_to_digits',
      type: 'reading',
      prompt: `اختر العدد: ${numberToWords(x)}`,
      answer: x,
      mistakes: near,
      data: { number: x, answer_value: x },
    });
  }
  return stringMC(ctx, {
    skill: 'numbers.digits_to_words',
    type: 'reading',
    prompt: `كيف يُقرأ العدد ${n(x)}؟`,
    answer: numberToWords(x),
    wrong: [...new Set(near)].map(numberToWords),
    data: { number: x, answer_value: numberToWords(x) },
  });
}

/** Compare two numbers. params: { range:[min,max], close?: boolean, equal_rate?: number } */
function compare(ctx) {
  const { rng, params } = ctx;
  const [lo, hi] = params.range;
  const a = rng.int(lo, hi);
  let b;
  if (rng.bool(params.equal_rate ?? 0.1)) b = a;
  else if (params.close) {
    // Same number of digits, differ in exactly one place — the tricky case.
    b = sampleUntil(
      () => {
        const p = rng.int(0, numDigits(a) - 1);
        return a + (rng.int(1, 9) - digitAt(a, p)) * 10 ** p;
      },
      (v) => v !== a && v >= lo && v <= hi && numDigits(v) === numDigits(a),
    );
  } else b = sampleUntil(() => rng.int(lo, hi), (v) => v !== a);
  const sym = a > b ? '>' : a < b ? '<' : '=';
  return stringMC(ctx, {
    skill: 'numbers.compare',
    type: 'comparison',
    prompt: `اختر الرمز المناسب: ${n(a)} ○ ${n(b)}`,
    answer: sym,
    wrong: ['>', '<', '='],
    count: 3,
    data: { a, b, answer_value: sym },
  });
}

/** Order 3–4 numbers. params: { range:[min,max], count:3|4 } */
function order(ctx) {
  const { rng, params } = ctx;
  const [lo, hi] = params.range;
  const k = params.count ?? 3;
  const nums = sampleUntil(
    () => Array.from({ length: k }, () => rng.int(lo, hi)),
    (arr) => new Set(arr).size === k,
  );
  const asc = rng.bool();
  const sorted = [...nums].sort((x, y) => (asc ? x - y : y - x));
  const fmt = (arr) => arr.map(n).join(SEP);
  const wrong = [];
  const seen = new Set([fmt(sorted)]);
  for (let i = 0; i < 20 && wrong.length < 3; i++) {
    const w = i === 0 ? [...sorted].reverse() : rng.shuffle(sorted);
    const s = fmt(w);
    if (!seen.has(s)) {
      seen.add(s);
      wrong.push(s);
    }
  }
  return stringMC(ctx, {
    skill: 'numbers.order',
    type: 'ordering',
    prompt: `رتّب الأعداد ${asc ? 'من الأصغر إلى الأكبر' : 'من الأكبر إلى الأصغر'}: ${fmt(nums)}`,
    answer: fmt(sorted),
    wrong,
    data: { numbers: nums, direction: asc ? 'asc' : 'desc', answer_value: sorted },
  });
}

export function roundTo(x, to) {
  return Math.floor((x + to / 2) / to) * to; // 5 and above round up
}
const TO_WORD = { 10: 'عشرة', 100: 'مئة', 1000: 'ألف' };

/** Rounding. params: { range:[min,max], to:[10|100|1000] } */
function round(ctx) {
  const { rng, params } = ctx;
  const to = rng.pick(params.to);
  const [lo, hi] = params.range;
  const x = sampleUntil(() => rng.int(Math.max(lo, to), hi), (v) => v % to !== 0);
  const ans = roundTo(x, to);
  const down = Math.floor(x / to) * to;
  return numericMC(ctx, {
    skill: `numbers.round.${to}`,
    prompt: `قرّب العدد ${n(x)} إلى أقرب ${TO_WORD[to]}.`,
    answer: ans,
    mistakes: [ans === down ? down + to : down, roundTo(x, to === 10 ? 100 : 10), ans + to, ans - to],
    data: { number: x, to, answer_value: ans },
  });
}

/**
 * Number patterns / skip counting.
 * params: { start:[min,max], steps:number[], directions:['up','down'], length?:number, max?:number }
 */
function pattern(ctx) {
  const { rng, params } = ctx;
  const len = params.length ?? 5;
  const max = params.max ?? Infinity;
  const { seq, step } = sampleUntil(
    () => {
      const step = rng.pick(params.steps) * (rng.pick(params.directions ?? ['up']) === 'down' ? -1 : 1);
      const start = rng.int(...params.start);
      return { step, seq: Array.from({ length: len }, (_, i) => start + i * step) };
    },
    ({ seq }) => seq.every((v) => v >= 0 && v <= max),
  );
  const hole = rng.int(1, len - 1);
  const ans = seq[hole];
  const shown = seq.map((v, i) => (i === hole ? '؟' : n(v))).join(SEP);
  return numericMC(ctx, {
    skill: 'numbers.pattern',
    type: 'pattern',
    prompt: `ما العدد المفقود في النمط؟ ${shown}`,
    answer: ans,
    mistakes: [ans + step, ans - step, ans + 1, ans - 1],
    data: { sequence: seq, step, missing_index: hole, answer_value: ans },
  });
}

/**
 * Estimating a quantity using a benchmark of ten.
 * params: { range:[min,max] }  (the true count; answer is the nearest ten)
 */
function estimateQuantity(ctx) {
  const { rng, params } = ctx;
  const count = sampleUntil(() => rng.int(...params.range), (v) => v % 10 !== 5);
  const ans = roundTo(count, 10);
  return numericMC(ctx, {
    skill: 'numbers.estimate_quantity',
    type: 'visual',
    prompt: 'انظر إلى الصورة. ما أفضل تقدير لعدد النجوم؟',
    answer: ans,
    mistakes: [ans + 10, ans - 10, ans + 20, ans - 20],
    choiceOpts: { min: 10, step: 10 },
    visual: { kind: 'object_cloud', object: 'star', count, benchmark: 10 },
    data: { count, answer_value: ans },
  });
}

export default {
  'num.place_value': placeValue,
  'num.read_write': readWrite,
  'num.compare': compare,
  'num.order': order,
  'num.round': round,
  'num.pattern': pattern,
  'num.estimate_quantity': estimateQuantity,
};
