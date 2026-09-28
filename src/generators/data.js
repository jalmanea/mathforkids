// Data & chance: tally tables, picture graphs, bar graphs, certain/impossible, more/less likely.
import { countNoun, NOUNS } from '../core/arabic.js';
import { numericMC, stringMC, sampleUntil } from './common.js';

const TOPICS = [
  { title: 'الفاكهة المفضلة لدى طلاب الصف', labels: ['التفاح', 'الموز', 'البرتقال', 'العنب', 'الفراولة'] },
  { title: 'الرياضة المفضلة لدى طلاب الصف', labels: ['كرة القدم', 'السباحة', 'الجري', 'كرة السلة', 'ركوب الدراجة'] },
  { title: 'اللون المفضل لدى طلاب الصف', labels: ['الأحمر', 'الأزرق', 'الأخضر', 'الأصفر', 'البنفسجي'] },
  { title: 'الحيوان المفضل لدى طلاب الصف', labels: ['القط', 'الجمل', 'الحصان', 'الأرنب', 'الصقر'] },
];

/** Build a small dataset. Values are multiples of `unit` in [unit, max]. */
function dataset(rng, { categories = 4, max, unit = 1 }) {
  const topic = rng.pick(TOPICS);
  const labels = rng.sample(topic.labels, categories);
  const rows = sampleUntil(
    () => labels.map((label) => ({ label, value: rng.int(1, Math.floor(max / unit)) * unit })),
    // distinct values so "most/least" is unambiguous
    (rs) => new Set(rs.map((r) => r.value)).size === rs.length,
  );
  return { title: topic.title, rows };
}

/** One question about a dataset, shared by tally / picture / bar graph generators. */
function askAbout(ctx, ds, visual, skillPrefix) {
  const { rng, params } = ctx;
  const ask = rng.pick(params.ask ?? ['value', 'difference', 'most', 'least']);
  const rows = ds.rows;
  if (ask === 'most' || ask === 'least') {
    const sorted = [...rows].sort((a, b) => (ask === 'most' ? b.value - a.value : a.value - b.value));
    return stringMC(ctx, {
      skill: `${skillPrefix}.${ask}`,
      type: 'visual',
      prompt: `${ds.title}: ما ${ask === 'most' ? 'أكثر' : 'أقل'} اختيار؟`,
      answer: sorted[0].label,
      wrong: sorted.slice(1).map((r) => r.label),
      visual,
      data: { rows, answer_value: sorted[0].label },
    });
  }
  if (ask === 'difference') {
    const [a, b] = rng.sample(rows, 2).sort((x, y) => y.value - x.value);
    const d = a.value - b.value;
    return numericMC(ctx, {
      skill: `${skillPrefix}.difference`,
      type: 'visual',
      prompt: `${ds.title}: كم يزيد عدد الذين اختاروا ${a.label} على عدد الذين اختاروا ${b.label}؟`,
      answer: d,
      mistakes: [a.value + b.value, a.value, b.value, d + 1, d - 1],
      choiceOpts: { min: 1 },
      visual,
      data: { rows, compare: [a.label, b.label], answer_value: d },
    });
  }
  if (ask === 'total') {
    const t = rows.reduce((s, r) => s + r.value, 0);
    return numericMC(ctx, {
      skill: `${skillPrefix}.total`,
      type: 'visual',
      prompt: `${ds.title}: كم عدد الطلاب جميعهم؟`,
      answer: t,
      mistakes: [t - rows[0].value, t + 1, t - 1, t + 10],
      visual,
      data: { rows, answer_value: t },
    });
  }
  const r = rng.pick(rows);
  return numericMC(ctx, {
    skill: `${skillPrefix}.value`,
    type: 'visual',
    prompt: `${ds.title}: كم طالبًا اختار ${r.label}؟`,
    answer: r.value,
    mistakes: rows.filter((x) => x !== r).map((x) => x.value).concat([r.value + 1, r.value - 1]),
    choiceOpts: { min: 1 },
    visual,
    data: { rows, asked: r.label, answer_value: r.value },
  });
}

/** Tally table. params: { max:number, ask? } */
function tally(ctx) {
  const ds = dataset(ctx.rng, { max: ctx.params.max });
  return askAbout(ctx, ds, { kind: 'tally_table', title: ds.title, rows: ds.rows }, 'data.tally');
}

/**
 * Picture graph. params: { max:number, keys:number[] (value of one symbol), ask? }
 * With key > 1 the child must multiply/skip-count; half symbols are never used.
 */
function pictograph(ctx) {
  const key = ctx.rng.pick(ctx.params.keys);
  const ds = dataset(ctx.rng, { max: ctx.params.max, unit: key });
  const visual = {
    kind: 'pictograph',
    title: ds.title,
    key,
    key_label: `كل رمز يمثل ${countNoun(key, NOUNS.student, 'acc')}`,
    rows: ds.rows.map((r) => ({ label: r.label, symbols: r.value / key })),
  };
  return askAbout(ctx, ds, visual, 'data.pictograph');
}

/** Bar graph. params: { max:number, scale:number[] (axis step), ask? } */
function barGraph(ctx) {
  const step = ctx.rng.pick(ctx.params.scale);
  const ds = dataset(ctx.rng, { max: ctx.params.max, unit: step });
  return askAbout(ctx, ds, { kind: 'bar_graph', title: ds.title, axis_step: step, bars: ds.rows }, 'data.bar_graph');
}

const COLORS = [
  { word: 'حمراء', noun: 'الحمراء' },
  { word: 'زرقاء', noun: 'الزرقاء' },
  { word: 'خضراء', noun: 'الخضراء' },
  { word: 'صفراء', noun: 'الصفراء' },
];

/**
 * Chance language.
 * params: {
 *   mode: 'certain_impossible' | 'more_less_likely' | 'describe4' | 'all',
 *   allow_possible?: boolean,
 *   terms: { certain, possible, impossible, more, less }
 * }
 * Ball counts are always >= 3 so colour adjectives never need dual agreement.
 */
function chance(ctx) {
  const { rng, params } = ctx;
  const t = params.terms;
  const mode = params.mode === 'all' ? rng.pick(['certain_impossible', 'more_less_likely']) : params.mode;
  const [c1, c2] = rng.sample(COLORS, 2);
  if (mode === 'describe4') {
    // Grade 3 (10-6): describe one event as أكيد / أكثر احتمالًا / أقل احتمالًا / مستحيل.
    const kind = rng.pick(['certain', 'more', 'less', 'impossible']);
    const [a, b] = {
      certain: () => [rng.int(3, 9), 0],
      impossible: () => [0, rng.int(3, 9)],
      more: () => sampleUntil(() => [rng.int(3, 10), rng.int(3, 10)], ([x, y]) => x - y >= 2),
      less: () => sampleUntil(() => [rng.int(3, 10), rng.int(3, 10)], ([x, y]) => y - x >= 2),
    }[kind]();
    const parts = [];
    if (a) parts.push(`${countNoun(a, NOUNS.ball)} ${c1.word}`);
    if (b) parts.push(`${countNoun(b, NOUNS.ball)} ${c2.word}`);
    const answer = t[kind];
    return stringMC(ctx, {
      skill: 'chance.describe',
      prompt: `في كيس ${parts.join(' و')}. سُحبت كرة دون النظر. أصف احتمال سحب كرة ${c1.word}:`,
      answer,
      wrong: ['certain', 'more', 'less', 'impossible'].filter((k) => k !== kind).map((k) => t[k]),
      visual: { kind: 'bag', items: [{ color: c1.noun, count: a }, { color: c2.noun, count: b }].filter((x) => x.count) },
      data: { bag: { [c1.noun]: a, [c2.noun]: b }, draw: c1.noun, answer_value: answer },
    });
  }
  if (mode === 'certain_impossible') {
    const onlyOne = params.allow_possible ? rng.bool(0.66) : true;
    const a = rng.int(3, 9);
    const b = onlyOne ? 0 : rng.int(3, 9);
    const bag = b ? `${countNoun(a, NOUNS.ball)} ${c1.word} و${countNoun(b, NOUNS.ball)} ${c2.word}` : `${countNoun(a, NOUNS.ball)} ${c1.word} فقط`;
    const drawColor = rng.pick([c1, c2]);
    const inBag = drawColor === c1 ? a : b;
    const total = a + b;
    const answer = inBag === total ? t.certain : inBag === 0 ? t.impossible : t.possible;
    const options = params.allow_possible ? [t.certain, t.possible, t.impossible] : [t.certain, t.impossible];
    return stringMC(ctx, {
      skill: 'chance.certain_impossible',
      prompt: `في كيس ${bag}. سُحبت كرة دون النظر. سحب كرة ${drawColor.word} حدث:`,
      answer,
      wrong: options.filter((o) => o !== answer),
      count: options.length,
      visual: { kind: 'bag', items: [{ color: c1.noun, count: a }, { color: c2.noun, count: b }].filter((x) => x.count) },
      data: { bag: { [c1.noun]: a, [c2.noun]: b }, draw: drawColor.noun, answer_value: answer },
    });
  }
  const [a, b] = sampleUntil(() => [rng.int(3, 10), rng.int(3, 10)], ([x, y]) => Math.abs(x - y) >= 2);
  const askMore = rng.bool();
  const answer = (a > b) === askMore ? `كرة ${c1.word}` : `كرة ${c2.word}`;
  return stringMC(ctx, {
    skill: `chance.${askMore ? 'more' : 'less'}_likely`,
    prompt: `في كيس ${countNoun(a, NOUNS.ball)} ${c1.word} و${countNoun(b, NOUNS.ball)} ${c2.word}. أيهما ${askMore ? t.more : t.less} عند السحب دون النظر؟`,
    answer,
    wrong: [`كرة ${c1.word}`, `كرة ${c2.word}`],
    count: 2,
    visual: { kind: 'bag', items: [{ color: c1.noun, count: a }, { color: c2.noun, count: b }] },
    data: { bag: { [c1.noun]: a, [c2.noun]: b }, answer_value: answer },
  });
}

export default {
  'data.tally': tally,
  'data.pictograph': pictograph,
  'data.bar_graph': barGraph,
  'data.chance': chance,
};
