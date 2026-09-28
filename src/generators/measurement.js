// Measurement: money (riyals), time, length, area, perimeter, capacity, mass, volume.
import { n } from '../core/digits.js';
import { person, v, countNoun, NOUNS } from '../core/arabic.js';
import { numericMC, stringMC, sampleUntil } from './common.js';

// ---------------------------------------------------------------- money

// In the grade-2 book (7-1) the 1 and 2 riyal are coins; 5, 10, 50, 100 are notes.
const moneyItem = (value) => ({ value, form: value <= 2 ? 'coin' : 'note' });
const moneyPhrase = (value) => (value <= 2 ? `قطعة نقدية من فئة ` : `ورقة نقدية من فئة `) + countNoun(value, NOUNS.riyal, 'gen');

/**
 * Count a collection of riyal notes/coins.
 * params: { denominations:number[], count:[min,max], max_total:number }
 */
function moneyCount(ctx) {
  const { rng, params } = ctx;
  const items = sampleUntil(
    () => Array.from({ length: rng.int(...params.count) }, () => rng.pick(params.denominations)).sort((a, b) => b - a),
    (arr) => arr.reduce((s, x) => s + x, 0) <= params.max_total,
  );
  const total = items.reduce((s, x) => s + x, 0);
  return numericMC(ctx, {
    skill: 'money.count',
    type: 'visual',
    prompt: 'كم ريالًا في الصورة؟',
    answer: total,
    mistakes: [items.length, total - items[items.length - 1], total + items[items.length - 1], total + 10, total - 1],
    visual: { kind: 'money', currency: 'SAR', items: items.map(moneyItem) },
    data: { items, answer_value: total },
  });
}

/**
 * Which note/coin makes a given value, or simple word problem with riyals.
 * params: { denominations:number[], max_total:number }
 */
function moneyWord(ctx) {
  const { rng, params } = ctx;
  const p = person(rng);
  const [a, b] = sampleUntil(
    () => [rng.pick(params.denominations), rng.pick(params.denominations)],
    ([x, y]) => x + y <= params.max_total,
  );
  const s = a + b;
  return numericMC(ctx, {
    skill: 'money.word.add',
    type: 'word_problem',
    prompt: `مع ${p.name} ${moneyPhrase(a)} و${moneyPhrase(b)}. كم ريالًا ${v(p, 'معه', 'معها')}؟`,
    answer: s,
    mistakes: [s + 1, s - 1, Math.abs(a - b), s + 10],
    visual: { kind: 'money', currency: 'SAR', items: [a, b].map(moneyItem) },
    data: { items: [a, b], answer_value: s },
  });
}

// ---------------------------------------------------------------- time

const HOUR_WORDS = ['', 'الواحدة', 'الثانية', 'الثالثة', 'الرابعة', 'الخامسة', 'السادسة', 'السابعة', 'الثامنة', 'التاسعة', 'العاشرة', 'الحادية عشرة', 'الثانية عشرة'];
const pad2 = (m) => (m < 10 ? `0${m}` : String(m));
/** Time in words, whole/quarter/half hours only. */
export function timeWords(h, m) {
  if (m === 0) return `الساعة ${HOUR_WORDS[h]}`;
  if (m === 15) return `الساعة ${HOUR_WORDS[h]} والربع`;
  if (m === 30) return `الساعة ${HOUR_WORDS[h]} والنصف`;
  if (m === 45) return `الساعة ${HOUR_WORDS[(h % 12) + 1]} إلا الربع`;
  throw new Error(`timeWords: ${m} minutes has no word form`);
}
export const clockText = (h, m) => n(`${h}:${pad2(m)}`);

/**
 * Read an analogue clock.
 * params: { minute_step: 60 | 30 | 15 | 5 | 1, format: 'digital' | 'words' | 'both' }
 */
function readClock(ctx) {
  const { rng, params } = ctx;
  const step = params.minute_step;
  const h = rng.int(1, 12);
  const m = step === 60 ? 0 : rng.int(0, 60 / step - 1) * step;
  const next = (h % 12) + 1;
  const prev = ((h + 10) % 12) + 1;
  // Classic slips: hands swapped, hour read as the next hour, minutes off by a step.
  const wrong = [
    [next, m],
    [prev, m],
    [h, (m + (step === 60 ? 30 : step)) % 60],
    [m === 0 ? 12 : Math.max(1, Math.round(m / 5)), (h * 5) % 60],
  ].filter(([hh, mm]) => !(hh === h && mm === m));
  const words = rng.pick(params.format === 'both' ? ['digital', 'words'] : [params.format]) === 'words' && m % 15 === 0;
  const fmt = ([hh, mm]) => (words ? timeWords(hh, mm) : clockText(hh, mm));
  return stringMC(ctx, {
    skill: `time.read.${step}`,
    type: 'visual',
    prompt: 'كم الساعة؟',
    answer: fmt([h, m]),
    wrong: (words ? wrong.filter(([, mm]) => mm % 15 === 0) : wrong).map(fmt),
    visual: { kind: 'clock', hour: h, minute: m },
    data: { hour: h, minute: m, answer_value: { hour: h, minute: m } },
  });
}

// Everyday activities for "estimate time" and "order daily events". Durations are
// order-of-magnitude facts, not precise values.
const DURATIONS = [
  { text: 'تنظيف الأسنان', unit: 'دقيقة' },
  { text: 'غسل اليدين', unit: 'دقيقة' },
  { text: 'ارتداء الحذاء', unit: 'دقيقة' },
  { text: 'شرب كوب من الماء', unit: 'دقيقة' },
  { text: 'اليوم الدراسي', unit: 'ساعة' },
  { text: 'النوم في الليل', unit: 'ساعة' },
  { text: 'رحلة بالسيارة من مدينة إلى مدينة أخرى', unit: 'ساعة' },
  { text: 'مشاهدة مباراة كرة قدم', unit: 'ساعة' },
  { text: 'نمو شجرة نخيل', unit: 'سنة' },
  { text: 'إجازة نهاية الأسبوع', unit: 'يوم' },
];
const UNITS = ['دقيقة', 'ساعة', 'يوم', 'سنة'];
const ROUGHLY = { دقيقة: 'بضع دقائق', ساعة: 'بضع ساعات', يوم: 'بضعة أيام', سنة: 'سنوات' };

/** Estimate how long an activity takes. params: { units: string[] } */
function estimateTime(ctx) {
  const { rng, params } = ctx;
  const units = params.units ?? UNITS;
  const item = rng.pick(DURATIONS.filter((d) => units.includes(d.unit)));
  return stringMC(ctx, {
    skill: 'time.estimate',
    prompt: `كم يستغرق ${item.text} تقريبًا؟`,
    answer: ROUGHLY[item.unit],
    wrong: units.filter((u) => u !== item.unit).map((u) => ROUGHLY[u]),
    data: { activity: item.text, unit: item.unit, answer_value: ROUGHLY[item.unit] },
  });
}

const ROUTINE = ['الاستيقاظ من النوم', 'تنظيف الأسنان', 'تناول الفطور', 'الذهاب إلى المدرسة', 'العودة من المدرسة', 'تناول الغداء', 'أداء الواجبات', 'النوم'];

/** Order daily events (before/after). */
function dailySequence(ctx) {
  const { rng } = ctx;
  const [i, j] = rng.sample([...ROUTINE.keys()], 2).sort((a, b) => a - b);
  const askFirst = rng.bool();
  const answer = askFirst ? ROUTINE[i] : ROUTINE[j];
  const [x, y] = rng.shuffle([ROUTINE[i], ROUTINE[j]]); // don't leak the answer by position
  return stringMC(ctx, {
    skill: 'time.sequence',
    prompt: `في يوم دراسي، أيهما يحدث ${askFirst ? 'أولًا' : 'لاحقًا'}: ${x} أم ${y}؟`,
    answer,
    wrong: [askFirst ? ROUTINE[j] : ROUTINE[i]],
    count: 2,
    data: { events: [ROUTINE[i], ROUTINE[j]], answer_value: answer },
  });
}

// ---------------------------------------------------------------- length

/**
 * Non-standard units: compare two objects measured in paper clips / cubes.
 * params: { range:[min,max] }
 */
function nonStandardLength(ctx) {
  const { rng, params } = ctx;
  const unit = rng.pick([
    { one: 'مشبك', two: 'مشبكان', few: 'مشابك', many: 'مشبكًا', g: 'm' },
    { one: 'مكعب', two: 'مكعبان', few: 'مكعبات', many: 'مكعبًا', g: 'm' },
  ]);
  const [x, y] = sampleUntil(() => [rng.int(...params.range), rng.int(...params.range)], ([a, b]) => a !== b);
  return numericMC(ctx, {
    skill: 'length.nonstandard.difference',
    prompt: `طول القلم ${countNoun(x, unit)}، وطول الممحاة ${countNoun(y, unit)}. كم ${unit.many} الفرق بين الطولين؟`,
    answer: Math.abs(x - y),
    mistakes: [x + y, Math.abs(x - y) + 1, Math.abs(x - y) - 1, Math.max(x, y)],
    choiceOpts: { min: 1 },
    data: { lengths: [x, y], answer_value: Math.abs(x - y) },
  });
}

/**
 * Reading a centimetre ruler (object may not start at 0).
 * params: { max_cm:number, offset: boolean }
 */
function rulerCm(ctx) {
  const { rng, params } = ctx;
  const start = params.offset ? rng.int(0, 5) : 0;
  const len = rng.int(2, params.max_cm - start);
  const end = start + len;
  return numericMC(ctx, {
    skill: params.offset ? 'length.ruler.offset' : 'length.ruler.zero',
    type: 'visual',
    prompt: 'كم سنتمترًا طول القلم؟',
    answer: len,
    mistakes: [end, len + 1, len - 1, start],
    choiceOpts: { min: 1 },
    visual: { kind: 'ruler', unit: 'cm', max: params.max_cm, start, end },
    data: { start, end, answer_value: len },
  });
}

/**
 * Metric unit conversion.
 * params: { conversions: ('m_cm'|'cm_mm'|'km_m'|'l_ml'|'kg_g')[], max_whole:number }
 */
const CONV = {
  m_cm: { big: 'م', small: 'سم', factor: 100 },
  cm_mm: { big: 'سم', small: 'ملم', factor: 10 },
  km_m: { big: 'كم', small: 'م', factor: 1000 },
  l_ml: { big: 'ل', small: 'مل', factor: 1000 },
  kg_g: { big: 'كجم', small: 'جم', factor: 1000 },
};
function convert(ctx) {
  const { rng, params } = ctx;
  const key = rng.pick(params.conversions);
  const c = CONV[key];
  const x = rng.int(1, params.max_whole);
  const ans = x * c.factor;
  return numericMC(ctx, {
    skill: `measure.convert.${key}`,
    type: 'fill_blank',
    prompt: `${n(x)} ${c.big} = ؟ ${c.small}`,
    answer: ans,
    mistakes: [x * 10, x * 100, x * 1000, x + c.factor].filter((m) => m !== ans),
    data: { value: x, conversion: key, factor: c.factor, answer_value: ans },
  });
}

// Everyday objects with the unit a grade 2–3 book expects and a typical whole-number value.
const UNIT_ITEMS = {
  length: [
    { text: 'طول ممحاة', unit: 'سنتمتر', value: 5 },
    { text: 'طول قلم رصاص', unit: 'سنتمتر', value: 15 },
    { text: 'عرض كتاب الرياضيات', unit: 'سنتمتر', value: 20 },
    { text: 'طول ملعب كرة القدم', unit: 'متر', value: 100 },
    { text: 'ارتفاع باب الفصل', unit: 'متر', value: 2 },
    { text: 'طول سبورة الفصل', unit: 'متر', value: 3 },
    { text: 'المسافة بين الرياض وجدة', unit: 'كيلومتر', value: 950 },
    { text: 'المسافة بين مكة المكرمة والمدينة المنورة', unit: 'كيلومتر', value: 400 },
    { text: 'سُمك قطعة نقدية', unit: 'ملمتر', value: 2 },
    { text: 'طول نملة', unit: 'ملمتر', value: 5 },
  ],
  capacity: [
    { text: 'كمية الماء في ملعقة', unit: 'ملّتر', value: 5 },
    { text: 'كمية الدواء في جرعة', unit: 'ملّتر', value: 10 },
    { text: 'كمية العصير في كوب', unit: 'ملّتر', value: 250 },
    { text: 'كمية الماء في حوض الاستحمام', unit: 'لتر', value: 200 },
    { text: 'كمية الوقود في خزان السيارة', unit: 'لتر', value: 60 },
    { text: 'كمية الماء في دلو', unit: 'لتر', value: 10 },
  ],
  mass: [
    { text: 'كتلة تمرة', unit: 'جرام', value: 10 },
    { text: 'كتلة قلم', unit: 'جرام', value: 20 },
    { text: 'كتلة بيضة', unit: 'جرام', value: 60 },
    { text: 'كتلة كيس أرز كبير', unit: 'كيلوجرام', value: 10 },
    { text: 'كتلة طفل', unit: 'كيلوجرام', value: 25 },
    { text: 'كتلة بطيخة', unit: 'كيلوجرام', value: 5 },
  ],
};
// Abbreviations as printed in grade 3 (8-1, 8-5, 8-6).
export const UNIT_ABBR = { ملمتر: 'ملم', سنتمتر: 'سم', متر: 'م', كيلومتر: 'كم', ملّتر: 'مل', لتر: 'ل', جرام: 'جم', كيلوجرام: 'كجم' };

/**
 * Choose the appropriate unit, or the reasonable estimate ("٢ م أم ٢ كم؟").
 * params: { quantity:'length'|'capacity'|'mass', units:string[], ask?: ('unit'|'estimate')[] }
 */
function chooseUnit(ctx) {
  const { rng, params } = ctx;
  const item = rng.pick(UNIT_ITEMS[params.quantity].filter((i) => params.units.includes(i.unit)));
  if (rng.pick(params.ask ?? ['unit']) === 'estimate') {
    const opt = (u) => `${n(item.value)} ${UNIT_ABBR[u]}`;
    return stringMC(ctx, {
      skill: `measure.estimate.${params.quantity}`,
      prompt: `أي ${params.units.length === 2 ? 'التقديرين' : 'التقديرات الآتية'} أنسب ${item.text.startsWith('ال') ? `لل${item.text.slice(2)}` : `ل${item.text}`}؟`,
      answer: opt(item.unit),
      wrong: params.units.filter((u) => u !== item.unit).map(opt),
      data: { item: item.text, unit: item.unit, value: item.value, answer_value: opt(item.unit) },
    });
  }
  return stringMC(ctx, {
    skill: `measure.unit.${params.quantity}`,
    prompt: `ما الوحدة المناسبة لقياس ${item.text}؟`,
    answer: item.unit,
    wrong: params.units.filter((u) => u !== item.unit),
    data: { item: item.text, answer_value: item.unit },
  });
}

/**
 * Non-standard capacity/mass comparison (cups to fill / cubes to balance).
 * params: { quantity:'capacity'|'mass', range:[min,max] }
 */
function nonStandardCompare(ctx) {
  const { rng, params } = ctx;
  const [x, y] = sampleUntil(() => [rng.int(...params.range), rng.int(...params.range)], ([a, b]) => a !== b);
  const cap = params.quantity === 'capacity';
  const [A, B] = cap ? ['الإبريق', 'القارورة'] : ['التفاحة', 'البرتقالة'];
  const unit = cap
    ? { one: 'كوب', two: 'كوبان', few: 'أكواب', many: 'كوبًا', g: 'm' }
    : { one: 'مكعب', two: 'مكعبان', few: 'مكعبات', many: 'مكعبًا', g: 'm' };
  const verb = cap ? 'يملأ' : 'يوازن';
  const answer = x > y ? A : B;
  return stringMC(ctx, {
    skill: `measure.nonstandard.${params.quantity}`,
    prompt: cap
      ? `يملأ ${A} ${countNoun(x, unit, 'acc')}، وتملأ ${B} ${countNoun(y, unit, 'acc')}. أيهما يسع أكثر؟`
      : `توازن ${A} ${countNoun(x, unit, 'acc')}، وتوازن ${B} ${countNoun(y, unit, 'acc')}. أيهما كتلتها أكبر؟`,
    answer,
    wrong: [answer === A ? B : A],
    count: 2,
    data: { values: { [A]: x, [B]: y }, verb, answer_value: answer },
  });
}

// ---------------------------------------------------------------- area, perimeter, volume

/**
 * Area by counting unit squares.
 * params: { rows:[min,max], cols:[min,max], composite?: boolean, compare?: boolean, halves?: boolean }
 */
function area(ctx) {
  const { rng, params } = ctx;
  if (params.compare) {
    const shapes = sampleUntil(
      () => [0, 1].map(() => ({ rows: rng.int(...params.rows), cols: rng.int(...params.cols) })),
      ([a, b]) => a.rows * a.cols !== b.rows * b.cols,
    );
    const names = ['الشكل الأحمر', 'الشكل الأزرق'];
    const answer = shapes[0].rows * shapes[0].cols > shapes[1].rows * shapes[1].cols ? names[0] : names[1];
    return stringMC(ctx, {
      skill: 'area.compare',
      type: 'visual',
      prompt: 'أي الشكلين مساحته أكبر؟',
      answer,
      wrong: names.filter((x) => x !== answer),
      count: 2,
      visual: { kind: 'grid_shapes', shapes: shapes.map((s, i) => ({ ...s, color: i ? 'blue' : 'red' })) },
      data: { areas: shapes.map((s) => s.rows * s.cols), answer_value: answer },
    });
  }
  const r = rng.int(...params.rows);
  const c = rng.int(...params.cols);
  let cells = r * c;
  let extra = null;
  if (params.composite && rng.bool()) {
    extra = { rows: rng.int(1, r - 1 || 1), cols: rng.int(1, 3) };
    cells += extra.rows * extra.cols;
  }
  // two half squares make one whole square (نصفا مربع يساويان مربعًا كاملًا)
  const halves = params.halves && rng.bool() ? 2 * rng.int(1, 3) : 0;
  cells += halves / 2;
  return numericMC(ctx, {
    skill: halves ? 'area.count.halves' : extra ? 'area.count.composite' : 'area.count',
    type: 'visual',
    prompt: 'ما مساحة الشكل بالوحدات المربعة؟',
    answer: cells,
    mistakes: [2 * (r + c), r + c, cells + 1, cells - 1, cells + r],
    visual: { kind: 'grid_area', rows: r, cols: c, attached: extra, half_squares: halves },
    data: { rows: r, cols: c, attached: extra, half_squares: halves, answer_value: cells },
  });
}

/** Perimeter. params: { shapes:('square'|'rectangle'|'triangle'|'polygon')[], side:[min,max] } */
function perimeter(ctx) {
  const { rng, params } = ctx;
  const shape = rng.pick(params.shapes);
  const s = () => rng.int(...params.side);
  let sides, prompt;
  if (shape === 'square') {
    const a = s();
    sides = [a, a, a, a];
    prompt = `ما محيط مربع طول ضلعه ${n(a)} سم؟`;
  } else if (shape === 'rectangle') {
    const [a, b] = sampleUntil(() => [s(), s()], ([x, y]) => x !== y);
    sides = [a, b, a, b];
    prompt = `ما محيط مستطيل طوله ${n(Math.max(a, b))} سم وعرضه ${n(Math.min(a, b))} سم؟`;
  } else {
    const k = shape === 'triangle' ? 3 : rng.int(4, 6);
    sides = Array.from({ length: k }, s);
    prompt = `أطوال أضلاع شكل هي: ${sides.map((x) => `${n(x)} سم`).join('، ')}. ما محيطه؟`;
  }
  const p = sides.reduce((a, b) => a + b, 0);
  const half = shape === 'rectangle' ? sides[0] + sides[1] : p - sides[0];
  return numericMC(ctx, {
    skill: `perimeter.${shape}`,
    prompt: `${prompt} (بالسنتمترات)`,
    answer: p,
    mistakes: [half, shape === 'rectangle' || shape === 'square' ? sides[0] * sides[1] : p + 1, p + 2, p - 2],
    choiceOpts: { min: 1 },
    visual: { kind: 'polygon', shape, sides },
    data: { shape, sides, answer_value: p },
  });
}

/** Volume by counting cubes. params: { dims:[min,max] } */
function volume(ctx) {
  const { rng, params } = ctx;
  const [l, w, h] = [rng.int(...params.dims), rng.int(...params.dims), rng.int(...params.dims)];
  const vol = l * w * h;
  return numericMC(ctx, {
    skill: 'volume.count_cubes',
    type: 'visual',
    prompt: 'ما حجم الشكل بالوحدات المكعبة؟',
    answer: vol,
    mistakes: [l * w, l + w + h, l * w + h, vol + l],
    visual: { kind: 'cube_stack', length: l, width: w, height: h },
    data: { dims: [l, w, h], answer_value: vol },
  });
}

export default {
  'money.count': moneyCount,
  'money.word': moneyWord,
  'time.read_clock': readClock,
  'time.estimate': estimateTime,
  'time.sequence': dailySequence,
  'length.nonstandard': nonStandardLength,
  'length.ruler': rulerCm,
  'measure.convert': convert,
  'measure.choose_unit': chooseUnit,
  'measure.nonstandard_compare': nonStandardCompare,
  'area.units': area,
  'perimeter': perimeter,
  'volume.cubes': volume,
};
