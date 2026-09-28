// Word problems and problem-solving strategy lessons (أحل المسألة / خطة حل المسألة).
// Each strategy lesson gets problems whose *structure* fits the strategy, with
// numbers kept inside the unit's constraints via params.
import { n } from '../core/digits.js';
import { person, v, countNoun, NOUNS, THING_KEYS } from '../core/arabic.js';
import { makeExercise } from '../core/exercise.js';
import { numericMC, stringMC, sampleUntil, needsCarry, needsBorrow, regroupOk } from './common.js';
import { roundTo } from './numbers.js';
import { clockText } from './measurement.js';
import { fracText } from './fractions.js';

const thing = (rng) => NOUNS[rng.pick(THING_KEYS)];
const OP_NAMES = { add: 'الجمع', sub: 'الطرح', mul: 'الضرب', div: 'القسمة' };

/** Build an add/sub story. Returns { text, op, a, b, answer }. */
function addSubStory(rng, params) {
  const kind = rng.pick(params.kinds ?? ['join', 'separate', 'compare']);
  const [lo, hi] = params.range;
  const noun = thing(rng);
  const p = person(rng);
  const policy = params.regroup ?? 'any';
  if (kind === 'join') {
    const [a, b] = sampleUntil(
      () => [rng.int(lo, hi), rng.int(lo, hi)],
      ([x, y]) => x + y <= (params.max ?? Infinity) && regroupOk(policy, needsCarry(x, y)),
    );
    return {
      op: 'add', a, b, answer: a + b, noun,
      text: `مع ${p.name} ${countNoun(a, noun)}، ثم ${v(p, 'اشترى', 'اشترت')} ${countNoun(b, noun, 'acc')}. كم ${noun.many} ${v(p, 'معه', 'معها')} الآن؟`,
    };
  }
  const [a, b] = sampleUntil(
    () => [rng.int(lo, hi), rng.int(lo, hi)],
    ([x, y]) => x > y && regroupOk(policy, needsBorrow(x, y)),
  );
  if (kind === 'separate') {
    return {
      op: 'sub', a, b, answer: a - b, noun,
      text: `مع ${p.name} ${countNoun(a, noun)}، ${v(p, 'أعطى', 'أعطت')} ${v(p, 'صديقه', 'صديقتها')} ${countNoun(b, noun, 'acc')}. كم ${noun.many} بقي ${v(p, 'معه', 'معها')}؟`,
    };
  }
  const q = person(rng, [p.name]);
  return {
    op: 'sub', a, b, answer: a - b, noun,
    text: `مع ${p.name} ${countNoun(a, noun)}، ومع ${q.name} ${countNoun(b, noun)}. كم ${noun.many} يزيد ما مع ${p.name} على ما مع ${q.name}؟`,
  };
}

/** Build a multiply/divide story (grade 3). */
function mulDivStory(rng, params) {
  const [gl, gh] = params.factor ?? [2, 10];
  const g = rng.int(gl, gh);
  const s = rng.int(gl, gh);
  const noun = thing(rng);
  if (rng.bool()) {
    return {
      op: 'mul', a: g, b: s, answer: g * s, noun,
      text: `${countNoun(g, NOUNS.box)}، في كل صندوق ${countNoun(s, noun)}. كم ${noun.many} في الصناديق كلها؟`,
    };
  }
  return {
    op: 'div', a: g * s, b: g, answer: s, noun,
    text: `${noun.g === 'f' ? 'وُزِّعت' : 'وُزِّع'} ${countNoun(g * s, noun)} بالتساوي على ${countNoun(g, NOUNS.box, 'gen')}. كم ${noun.many} في كل صندوق؟`,
  };
}

/**
 * Plain add/sub word problem.
 * params: { range:[min,max], kinds?:('join'|'separate'|'compare')[], regroup?, max? }
 */
function addSub(ctx) {
  const st = addSubStory(ctx.rng, ctx.params);
  const alt = st.op === 'add' ? Math.abs(st.a - st.b) : st.a + st.b;
  return numericMC(ctx, {
    skill: `word.${st.op}`,
    type: 'word_problem',
    prompt: st.text,
    answer: st.answer,
    mistakes: [alt, st.answer + 1, st.answer - 1, st.answer + 10, st.answer - 10],
    data: { op: st.op, operands: [st.a, st.b], answer_value: st.answer },
  });
}

/**
 * Choose the operation.
 * params: { ops:('add'|'sub'|'mul'|'div')[], range:[min,max], factor?:[min,max] }
 */
function chooseOperation(ctx) {
  const { rng, params } = ctx;
  const want = rng.pick(params.ops);
  const st =
    want === 'mul' || want === 'div'
      ? sampleUntil(() => mulDivStory(rng, params), (s) => s.op === want)
      : sampleUntil(() => addSubStory(rng, params), (s) => s.op === want);
  return stringMC(ctx, {
    skill: 'word.choose_operation',
    type: 'word_problem',
    prompt: `${st.text} ما العملية المناسبة لحل المسألة؟`,
    answer: OP_NAMES[st.op],
    wrong: params.ops.filter((o) => o !== st.op).map((o) => OP_NAMES[o]),
    count: params.ops.length,
    data: { op: st.op, operands: [st.a, st.b], answer_value: OP_NAMES[st.op], story_answer: st.answer },
  });
}

/** Write the number sentence for a story. params: { range, kinds?, regroup? } */
function numberSentence(ctx) {
  const st = addSubStory(ctx.rng, ctx.params);
  const s = (x, op, y, r) => `${n(x)} ${op} ${n(y)} = ${n(r)}`;
  const right = st.op === 'add' ? s(st.a, '+', st.b, st.a + st.b) : s(st.a, '-', st.b, st.a - st.b);
  const wrong =
    st.op === 'add'
      ? [s(st.a, '-', st.b, Math.abs(st.a - st.b)), s(st.a, '+', st.a, 2 * st.a), s(st.a + st.b, '-', st.a, st.b)]
      : [s(st.a, '+', st.b, st.a + st.b), s(st.b, '+', st.b, 2 * st.b), s(st.a, '-', st.a - st.b, st.b)];
  return stringMC(ctx, {
    skill: 'word.number_sentence',
    type: 'word_problem',
    prompt: `${st.text} ما الجملة العددية التي تحل المسألة؟`,
    answer: right,
    wrong,
    data: { op: st.op, operands: [st.a, st.b], answer_value: right, story_answer: st.answer },
  });
}

/** Logical reasoning: 2-digit number riddle. params: { variants: ('diff'|'sum')[] } */
function logicNumber(ctx) {
  const { rng, params } = ctx;
  const t = rng.int(1, 8);
  const variant = rng.pick(params.variants ?? ['diff', 'sum']);
  if (variant === 'diff') {
    const d = rng.int(1, 9 - t);
    const x = t * 10 + t + d;
    return numericMC(ctx, {
      skill: 'word.logic.digits_diff',
      type: 'word_problem',
      prompt: `أنا عدد من رقمين. رقم عشراتي ${n(t)}، ورقم آحادي أكبر من رقم عشراتي بمقدار ${n(d)}. من أنا؟`,
      answer: x,
      mistakes: [(t + d) * 10 + t, t * 10 + d, x + 10, x - 1],
      data: { tens: t, ones: t + d, answer_value: x },
    });
  }
  const o = rng.int(0, 9);
  const x = t * 10 + o;
  return numericMC(ctx, {
    skill: 'word.logic.digits_sum',
    type: 'word_problem',
    prompt: `أنا عدد من رقمين. رقم عشراتي ${n(t)}، ومجموع رقميَّ ${n(t + o)}. من أنا؟`,
    answer: x,
    mistakes: [o * 10 + t || x + 1, t * 10 + t + o > 99 ? x + 1 : t * 10 + ((t + o) % 10), x + 10, x - 10],
    data: { tens: t, ones: o, answer_value: x },
  });
}

/** Guess and check: two numbers from their sum and difference. params: { max_sum:number } */
function guessCheck(ctx) {
  const { rng, params } = ctx;
  const [big, small] = sampleUntil(
    () => [rng.int(2, params.max_sum), rng.int(1, params.max_sum)],
    ([b, s]) => b > s && b + s <= params.max_sum,
  );
  const askBig = rng.bool();
  const ans = askBig ? big : small;
  return numericMC(ctx, {
    skill: 'word.guess_check',
    type: 'word_problem',
    prompt: `فكّرت في عددين، مجموعهما ${n(big + small)} والفرق بينهما ${n(big - small)}. ما العدد ${askBig ? 'الأكبر' : 'الأصغر'}؟`,
    answer: ans,
    mistakes: [askBig ? small : big, big + small, big - small, ans + 1],
    choiceOpts: { min: 0 },
    data: { sum: big + small, diff: big - small, numbers: [big, small], answer_value: ans },
  });
}

/** Work backward. params: { range:[min,max], max?: number } — every quantity stays <= max (default: range max). */
function workBackward(ctx) {
  const { rng, params } = ctx;
  const [lo, hi] = params.range;
  const max = params.max ?? hi;
  const p = person(rng);
  const noun = thing(rng);
  const [start, gave, got] = sampleUntil(
    () => [rng.int(lo, hi), rng.int(1, Math.ceil(hi / 2)), rng.int(1, Math.ceil(hi / 2))],
    ([s, g, a]) => s > g && s - g + a <= max,
  );
  const end = start - gave + got;
  return numericMC(ctx, {
    skill: 'word.work_backward',
    type: 'word_problem',
    prompt: `كان مع ${p.name} عدد من ال${noun.few}، ${v(p, 'فأعطى', 'فأعطت')} ${v(p, 'أخاه', 'أختها')} ${countNoun(gave, noun, 'acc')}، ثم ${v(p, 'اشترى', 'اشترت')} ${countNoun(got, noun, 'acc')}، فأصبح ${v(p, 'معه', 'معها')} ${countNoun(end, noun)}. كم ${noun.many} كان ${v(p, 'معه', 'معها')} في البداية؟`,
    answer: start,
    mistakes: [end + gave + got, end - gave + got, end + gave - got * 2, end],
    choiceOpts: { min: 1 },
    data: { start, gave, got, end, answer_value: start },
  });
}

/**
 * Make a table: constant rate over days (skip counting in grade 2, multiplication in grade 3).
 * params: { rates:number[], days:[min,max], ask:('total'|'days')[], hint?: string }
 *   hint — the strategy wording of the lesson title, e.g. 'أنشئ جدولًا' (grade 2) or 'أعمل جدولًا' (grade 3)
 */
function makeTable(ctx) {
  const { rng, params } = ctx;
  const hint = params.hint ? ` (${params.hint})` : '';
  const p = person(rng);
  const r = rng.pick(params.rates);
  const d = rng.int(...params.days);
  const ask = rng.pick(params.ask);
  const total = r * d;
  const rows = Array.from({ length: d }, (_, i) => ({ day: i + 1, total: r * (i + 1) }));
  if (ask === 'days') {
    return numericMC(ctx, {
      skill: 'word.make_table.days',
      type: 'word_problem',
      prompt: `${v(p, 'يوفّر', 'توفّر')} ${p.name} ${countNoun(r, NOUNS.riyal, 'acc')} كل يوم. بعد كم يومًا يصبح ${v(p, 'معه', 'معها')} ${countNoun(total, NOUNS.riyal)}؟${hint}`,
      answer: d,
      mistakes: [d + 1, d - 1, total - r, r],
      choiceOpts: { min: 1 },
      visual: { kind: 'table', columns: ['اليوم', 'الريالات'], rows: rows.slice(0, 2).map((x) => [x.day, x.total]), open: true },
      data: { rate: r, days: d, answer_value: d },
    });
  }
  return numericMC(ctx, {
    skill: 'word.make_table.total',
    type: 'word_problem',
    prompt: `${v(p, 'يوفّر', 'توفّر')} ${p.name} ${countNoun(r, NOUNS.riyal, 'acc')} كل يوم. كم ريالًا ${v(p, 'يوفّر', 'توفّر')} في ${countNoun(d, DAY, 'gen')}؟${hint}`,
    answer: total,
    mistakes: [total + r, total - r, r + d, total + 1],
    choiceOpts: { min: 1 },
    visual: { kind: 'table', columns: ['اليوم', 'الريالات'], rows: rows.slice(0, 2).map((x) => [x.day, x.total]), open: true },
    data: { rate: r, days: d, answer_value: total },
  });
}

/**
 * Find a pattern.
 * params: { context:'numbers'|'time', steps:number[], length?:number, start?:[min,max] }
 */
function findPattern(ctx) {
  const { rng, params } = ctx;
  if (params.context === 'time') {
    const step = rng.pick(params.steps); // minutes: 30 or 15
    const h = rng.int(6, 9);
    const times = Array.from({ length: 5 }, (_, i) => {
      const mins = h * 60 + i * step;
      return [Math.floor(mins / 60), mins % 60];
    });
    const [nh, nm] = times[4];
    const answer = clockText(nh, nm);
    const off = ([hh, mm], d) => {
      const t = hh * 60 + mm + d;
      return clockText(Math.floor(t / 60), t % 60);
    };
    return stringMC(ctx, {
      skill: 'word.find_pattern.time',
      type: 'pattern',
      prompt: `تنطلق حافلة المدرسة في هذه المواعيد: ${times.slice(0, 4).map(([a, b]) => clockText(a, b)).join('، ')}. ما الموعد التالي؟`,
      answer,
      wrong: [off(times[4], step), off(times[4], -step + (step === 30 ? 15 : 5)), clockText(nh + 1, nm)],
      data: { step_minutes: step, times, answer_value: answer },
    });
  }
  const step = rng.pick(params.steps);
  const len = params.length ?? 4;
  const start = rng.int(...(params.start ?? [step, step * 2]));
  const target = len + rng.int(1, 2);
  const seq = Array.from({ length: target }, (_, i) => start + i * step);
  const ans = seq[target - 1];
  const p = person(rng);
  return numericMC(ctx, {
    skill: 'word.find_pattern.numbers',
    type: 'pattern',
    prompt: `${v(p, 'قرأ', 'قرأت')} ${p.name} في اليوم الأول ${countNoun(seq[0], NOUNS.page, 'acc')}، وفي كل يوم ${v(p, 'يقرأ', 'تقرأ')} ${countNoun(step, NOUNS.page, 'acc')} أكثر من اليوم السابق: ${seq.slice(0, len).map(n).join('، ')}. إذا استمر النمط، كم صفحة ${v(p, 'يقرأ', 'تقرأ')} في اليوم ${ORDINALS[target]}؟`,
    answer: ans,
    mistakes: [ans + step, ans - step, seq[len - 1] + 1, ans + 1],
    data: { sequence: seq, step, answer_value: ans },
  });
}
const ORDINALS = ['', 'الأول', 'الثاني', 'الثالث', 'الرابع', 'الخامس', 'السادس', 'السابع', 'الثامن', 'التاسع', 'العاشر'];

/**
 * Make a list: count arrangements/combinations.
 * params: { mode:'digits'|'combos', digits?:[3,4], combos?:[min,max] }
 */
function makeList(ctx) {
  const { rng, params } = ctx;
  if (params.mode === 'digits') {
    const k = rng.pick(params.digits ?? [3]);
    const ds = rng.sample([1, 2, 3, 4, 5, 6, 7, 8, 9], k);
    const ans = k * (k - 1);
    return numericMC(ctx, {
      skill: 'word.make_list.digits',
      type: 'word_problem',
      prompt: `كم عددًا من رقمين مختلفين يمكن تكوينه من الأرقام: ${ds.map(n).join('، ')}؟ (أنشئ قائمة)`,
      answer: ans,
      mistakes: [k, k * k, ans - 1, ans + 2],
      choiceOpts: { min: 1 },
      data: { digits: ds, answer_value: ans },
    });
  }
  const [a, b] = [rng.int(...params.combos), rng.int(...params.combos)];
  const p = person(rng);
  return numericMC(ctx, {
    skill: 'word.make_list.combos',
    type: 'word_problem',
    prompt: `${v(p, 'لدى', 'لدى')} ${p.name} ${countNoun(a, { one: 'قميص', two: 'قميصان', few: 'قمصان', many: 'قميصًا', g: 'm' })} و${countNoun(b, { one: 'بنطال', two: 'بنطالان', few: 'بناطيل', many: 'بنطالًا', g: 'm' })}. بكم طريقة مختلفة ${v(p, 'يمكنه', 'يمكنها')} اختيار قميص وبنطال؟ (أنشئ قائمة)`,
    answer: a * b,
    mistakes: [a + b, a * b + 1, a * b - 1, Math.max(a, b)],
    choiceOpts: { min: 1 },
    data: { a, b, answer_value: a * b },
  });
}

/** Multi-step add/sub (the four-step plan). params: { range:[min,max] } */
function twoStep(ctx) {
  const { rng, params } = ctx;
  const [lo, hi] = params.range;
  const [a, b, c] = sampleUntil(
    () => [rng.int(lo, hi), rng.int(1, Math.floor(hi / 2)), rng.int(1, Math.floor(hi / 2))],
    ([x, y, z]) => x + y > z,
  );
  const ans = a + b - c;
  return numericMC(ctx, {
    skill: 'word.two_step',
    type: 'word_problem',
    prompt: `في مكتبة الفصل ${countNoun(a, NOUNS.book)}. أُضيف إليها ${countNoun(b, NOUNS.book)}، ثم استعار الطلاب ${countNoun(c, NOUNS.book, 'acc')}. كم ${NOUNS.book.many} بقي في المكتبة؟`,
    answer: ans,
    mistakes: [a + b + c, a + b, a - b - c > 0 ? a - b - c : ans + 10, ans - 10],
    choiceOpts: { min: 0 },
    data: { operands: [a, b, c], answer_value: ans },
  });
}

/** Exact answer or estimate? params: { range:[min,max] } */
function exactOrEstimate(ctx) {
  const { rng, params } = ctx;
  const p = person(rng);
  const [a, b] = [rng.int(...params.range), rng.int(...params.range)];
  const exact = rng.bool();
  const q = exact
    ? `كم ريالًا ${v(p, 'سيدفع', 'ستدفع')} للبائع بالضبط؟`
    : `هل ${v(p, 'يكفيه', 'يكفيها')} ${countNoun(roundTo(a + b, 100) + 100, NOUNS.riyal)} تقريبًا؟`;
  const answer = exact ? 'جواب دقيق' : 'جواب تقديري';
  return stringMC(ctx, {
    skill: 'word.exact_or_estimate',
    type: 'word_problem',
    prompt: `${v(p, 'اشترى', 'اشترت')} ${p.name} حقيبة بـ${countNoun(a, NOUNS.riyal, 'gen')} وحذاءً بـ${countNoun(b, NOUNS.riyal, 'gen')}. ${q} هل نحتاج إلى جواب دقيق أم تقديري؟`,
    answer,
    wrong: [exact ? 'جواب تقديري' : 'جواب دقيق'],
    count: 2,
    data: { operands: [a, b], exact, answer_value: answer },
  });
}

/** Is the answer reasonable? params: { range:[min,max], op:'add'|'sub' } */
function reasonable(ctx) {
  const { rng, params } = ctx;
  const p = person(rng);
  const [a, b] = sampleUntil(() => [rng.int(...params.range), rng.int(...params.range)], ([x, y]) => x > y);
  const actual = params.op === 'sub' ? a - b : a + b;
  const ok = rng.bool();
  const claim = ok ? roundTo(actual, 10) : roundTo(actual, 10) + rng.pick([-1, 1]) * rng.pick([50, 100, 200]);
  if (claim <= 0) return reasonable(ctx);
  const answer = ok ? 'نعم' : 'لا';
  return stringMC(ctx, {
    skill: 'word.reasonable',
    type: 'word_problem',
    prompt: `${v(p, 'قال', 'قالت')} ${p.name}: ناتج ${n(a)} ${params.op === 'sub' ? '-' : '+'} ${n(b)} نحو ${n(claim)}. هل هذا الجواب معقول؟`,
    answer,
    wrong: [ok ? 'لا' : 'نعم'],
    count: 2,
    data: { operands: [a, b], op: params.op, claim, actual, answer_value: answer },
  });
}

const DAY = { one: 'يوم', two: 'يومان', few: 'أيام', many: 'يومًا', g: 'm' };
const TABLE = { one: 'طاولة', two: 'طاولتان', few: 'طاولات', many: 'طاولة', g: 'f' };
const PART = { one: 'جزء', two: 'جزآن', two_acc: 'جزأين', few: 'أجزاء', many: 'جزءًا', g: 'm' };
const CAN = { one: 'علبة', two: 'علبتان', few: 'علب', many: 'علبة', g: 'f' };

/** Identify extra information (multiplication context). params: { factor:[min,max] } */
function extraInfo(ctx) {
  const { rng, params } = ctx;
  const p = person(rng);
  const noun = thing(rng);
  const [g, s] = [rng.int(...params.factor), rng.int(...params.factor)];
  const age = rng.int(7, 10);
  const facts = [
    { key: 'boxes', label: `عدد العلب (${n(g)})` },
    { key: 'per_box', label: `عدد ال${noun.few} في كل علبة (${n(s)})` },
    { key: 'age', label: `عمر ${p.name} (${n(age)})` },
  ];
  return stringMC(ctx, {
    skill: 'word.extra_information',
    type: 'word_problem',
    prompt: `${v(p, 'اشترى', 'اشترت')} ${p.name} ${countNoun(g, CAN, 'acc')}، في كل علبة ${countNoun(s, noun)}، وعمر ${p.name} ${n(age)} سنوات. كم ${noun.many} ${v(p, 'اشترى', 'اشترت')}؟ ما المعطى الزائد في المسألة؟`,
    answer: facts[2].label,
    wrong: facts.slice(0, 2).map((f) => f.label),
    count: 3,
    data: { boxes: g, per_box: s, extra: 'age', story_answer: g * s, answer_value: facts[2].label },
  });
}

/** Solve a simpler problem: tables pushed together (2k + 2 seats). params: { tables:[min,max] } */
function simplerProblem(ctx) {
  const { rng, params } = ctx;
  const k = rng.int(...params.tables);
  const ans = 2 * k + 2;
  return numericMC(ctx, {
    skill: 'word.simpler_problem',
    type: 'word_problem',
    prompt: `يجلس ${countNoun(4, NOUNS.student)} حول طاولة مربعة، طالب على كل ضلع. إذا وُضعت ${countNoun(k, TABLE)} متلاصقة في صف واحد، فكم طالبًا يمكن أن يجلس حولها؟`,
    answer: ans,
    mistakes: [4 * k, 4 * k - 2, ans + 2, ans - 2],
    choiceOpts: { min: 1 },
    visual: { kind: 'tables_row', tables: k },
    data: { tables: k, answer_value: ans },
  });
}

/**
 * Draw a picture: fraction stories.
 * params: { denominators:number[], ask:('eaten'|'left'|'count')[], groups?:[min,max] }
 */
function drawPictureFraction(ctx) {
  const { rng, params } = ctx;
  const p = person(rng);
  const den = rng.pick(params.denominators);
  const ask = rng.pick(params.ask);
  if (ask === 'count') {
    const g = rng.int(...(params.groups ?? [2, 4]));
    const total = den * g;
    return numericMC(ctx, {
      skill: 'word.draw_picture.fraction_of_set',
      type: 'word_problem',
      prompt: `مع ${p.name} ${countNoun(total, NOUNS.flower)}، ${fracText(1, den)} منها حمراء. كم وردة حمراء ${v(p, 'معه', 'معها')}؟ (أرسم صورة)`,
      answer: g,
      mistakes: [den, total - g, g + 1, 2 * g],
      choiceOpts: { min: 1 },
      data: { total, den, answer_value: g },
    });
  }
  const k = rng.int(1, den - 1);
  const num = ask === 'eaten' ? k : den - k;
  const frac = [num, den];
  const choices = rng.shuffle([frac, [den - num, den], [num, den + 1], [den, num]].filter((f, i, arr) => f[0] > 0 && arr.findIndex((g) => g[0] === f[0] && g[1] === f[1]) === i));
  return makeExercise({
    lesson: ctx.lesson,
    difficulty: ctx.difficulty,
    rng,
    skill: `word.draw_picture.${ask}`,
    type: 'word_problem',
    prompt: `قُسِّمت فطيرة إلى ${den === 2 ? 'جزأين متساويين' : `${n(den)} أجزاء متساوية`}، ${v(p, 'أكل', 'أكلت')} ${p.name} ${countNoun(k, PART, 'acc')} منها. ما الكسر الذي يدل على ${ask === 'eaten' ? 'ما أُكل' : 'ما بقي'} من الفطيرة؟ (أرسم صورة)`,
    answer: fracText(...frac),
    choices: choices.map((f) => fracText(...f)),
    data: {
      display: 'fraction',
      den,
      eaten: k,
      answer_value: { num, den },
      choice_values: choices.map(([a, b]) => ({ num: a, den: b })),
    },
  });
}

export default {
  'word.add_sub': addSub,
  'word.choose_operation': chooseOperation,
  'word.number_sentence': numberSentence,
  'word.logic_number': logicNumber,
  'word.guess_check': guessCheck,
  'word.work_backward': workBackward,
  'word.make_table': makeTable,
  'word.find_pattern': findPattern,
  'word.make_list': makeList,
  'word.two_step': twoStep,
  'word.exact_or_estimate': exactOrEstimate,
  'word.reasonable': reasonable,
  'word.extra_info': extraInfo,
  'word.simpler_problem': simplerProblem,
  'word.draw_picture_fraction': drawPictureFraction,
};
