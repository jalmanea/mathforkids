// Independent answer checkers used by the validation suite.
//
// These deliberately do NOT import generator code: they recompute answers from
// the exercise's own prompt/data using separate logic and separate fact tables,
// so a bug in a generator can't hide behind the same bug in its checker.
import { readFileSync } from 'node:fs';
import { fromArabicDigits } from '../src/core/digits.js';

// Science answers are checked against the lesson's content bank, read here straight from the JSON.
const SCIENCE = new Map();
for (const g of JSON.parse(readFileSync(new URL('../curriculum/science.json', import.meta.url), 'utf8')).grades) {
  for (const s of g.semesters) for (const u of s.units) for (const l of u.lessons) SCIENCE.set(l.id, l.content);
}
const others = (ex) => ex.choices.filter((c) => c !== ex.answer);

const ISOLATES = /[⁦-⁩]/g;
export const plain = (s) => fromArabicDigits(String(s).replace(ISOLATES, '')).replace(/٫/g, '.');
const num = (s) => {
  const t = plain(s).trim();
  if (/^\d+$/.test(t)) return Number(t);
  const m = t.match(/^(\d+)\/(\d+)$/);
  return m ? Number(m[1]) / Number(m[2]) : null;
};

// ---------------------------------------------------------------- equations

/** Evaluate a pure arithmetic expression (digits, + - × ÷ / parentheses). */
function evalExpr(expr) {
  const js = expr.replace(/×/g, '*').replace(/÷/g, '/').replace(/−/g, '-');
  if (!/^[\d+\-*/(). ]+$/.test(js)) throw new Error(`not arithmetic: "${expr}"`);
  return Function(`"use strict"; return (${js});`)();
}

const close = (a, b) => Math.abs(a - b) < 1e-9;

/** Is "lhs = rhs [= ...]" (or "a OP b" for > < =) true? `s` is already plain. */
function equationHolds(s) {
  const cmp = s.match(/^(.*?)\s*([<>])\s*(.*)$/);
  if (cmp) {
    const [l, r] = [evalExpr(cmp[1]), evalExpr(cmp[3])];
    return cmp[2] === '>' ? l > r && !close(l, r) : l < r && !close(l, r);
  }
  const sides = s.split('=').map((x) => evalExpr(x.trim()));
  return sides.every((v) => close(v, sides[0]));
}

/**
 * Math segments of a prompt: pieces separated by Arabic comma/colon/period
 * that consist only of numbers, operators, the blank "؟" and "○".
 */
function mathSegments(prompt) {
  return plain(prompt)
    .split(/[،:.]/)
    .map((seg) => seg.replace(/إذن/g, '').trim())
    .filter((seg) => (seg.includes('=') || seg.includes('○')) && /^[\d+\-×÷/()=○؟ ]+$/.test(seg));
}

/**
 * If the prompt is (or contains) an equation with a blank, check that the
 * answer fills it correctly AND that no other choice does.
 * Returns true when an equation was found and checked.
 */
export function checkEquationPrompt(ex, assert) {
  const segs = mathSegments(ex.prompt);
  if (!segs.length) return false;
  const fill = (seg, val) => seg.replace('؟', plain(val)).replace('○', plain(val));
  const blanks = segs.filter((s) => s.includes('؟') || s.includes('○'));
  // every fully-given segment (e.g. "8 + 5 = 13" before "إذن") must be true
  for (const seg of segs.filter((s) => !blanks.includes(s))) {
    assert.ok(equationHolds(seg), `given statement is false: "${seg}" in ${ex.prompt}`);
  }
  if (!blanks.length) return false;
  for (const seg of blanks) {
    assert.ok(equationHolds(fill(seg, ex.answer)), `answer ${ex.answer} does not satisfy "${seg}"`);
    for (const c of ex.choices ?? []) {
      if (c === ex.answer) continue;
      let ok = false;
      try {
        ok = equationHolds(fill(seg, c));
      } catch {
        ok = false;
      }
      assert.ok(!ok, `distractor ${c} also satisfies "${seg}"`);
    }
  }
  return true;
}

/** Answers that are themselves equations ("35 + 17 = 52") must be true; wrong choices false (or not checking). */
export function checkEquationAnswer(ex, assert) {
  const a = plain(ex.answer);
  if (!a.includes('=') || !/\d/.test(a) || !/^[\d+\-×÷/()= ]+$/.test(a)) return false;
  assert.ok(equationHolds(a), `answer equation is false: ${a}`);
  return true;
}

// ---------------------------------------------------------------- fact tables (independent copies)

const SOLID_FACTS = {
  مكعب: [6, 12, 8],
  'متوازي مستطيلات': [6, 12, 8],
  هرم: [5, 8, 5],
  'هرم رباعي': [5, 8, 5],
};
const ROLLS = new Set(['أسطوانة', 'مخروط', 'كرة']);
const SIDES = { دائرة: 0, مثلث: 3, مربع: 4, مستطيل: 4, 'شكل رباعي': 4, 'متوازي أضلاع': 4, 'شبه منحرف': 4, 'شكل خماسي': 5, 'شكل سداسي': 6, 'شكل ثماني': 8 };
const AXES = { مربع: 4, مستطيل: 2, 'مثلث متطابق الأضلاع': 3, 'مثلث متطابق الضلعين': 1, قلب: 1 };
const PROPERTY = { commutative: 'خاصية الإبدال', identity: 'خاصية العنصر المحايد', associative: 'خاصية التجميع' };
const ABBR = { ملمتر: 'ملم', سنتمتر: 'سم', متر: 'م', كيلومتر: 'كم', ملّتر: 'مل', لتر: 'ل', جرام: 'جم', كيلوجرام: 'كجم' };
const HOURS = [null, 'الواحدة', 'الثانية', 'الثالثة', 'الرابعة', 'الخامسة', 'السادسة', 'السابعة', 'الثامنة', 'التاسعة', 'العاشرة', 'الحادية عشرة', 'الثانية عشرة'];
function timeInWords(h, m) {
  const next = h === 12 ? 1 : h + 1;
  return { 0: `الساعة ${HOURS[h]}`, 15: `الساعة ${HOURS[h]} والربع`, 30: `الساعة ${HOURS[h]} والنصف`, 45: `الساعة ${HOURS[next]} إلا الربع` }[m];
}
const HAS_SYMMETRY = {
  مربع: true, مستطيل: true, دائرة: true, 'مثلث متطابق الأضلاع': true, 'مثلث متطابق الضلعين': true,
  'مثلث مختلف الأضلاع': false, قلب: true, 'متوازي أضلاع': false,
};
const PLACES = ['الآحاد', 'العشرات', 'المئات', 'الألوف', 'عشرات الألوف'];
const OP_WORD = { add: 'الجمع', sub: 'الطرح', mul: 'الضرب', div: 'القسمة' };
const UNIT_OK = {
  'طول ممحاة': 'سنتمتر', 'طول قلم رصاص': 'سنتمتر', 'عرض كتاب الرياضيات': 'سنتمتر', 'طول ملعب كرة القدم': 'متر',
  'ارتفاع باب الفصل': 'متر', 'طول سبورة الفصل': 'متر', 'المسافة بين الرياض وجدة': 'كيلومتر',
  'المسافة بين مكة المكرمة والمدينة المنورة': 'كيلومتر', 'سُمك قطعة نقدية': 'ملمتر', 'طول نملة': 'ملمتر',
  'كمية الماء في ملعقة': 'ملّتر', 'كمية الدواء في جرعة': 'ملّتر', 'كمية العصير في كوب': 'ملّتر',
  'كمية الماء في حوض الاستحمام': 'لتر', 'كمية الوقود في خزان السيارة': 'لتر', 'كمية الماء في دلو': 'لتر',
  'كتلة تمرة': 'جرام', 'كتلة قلم': 'جرام', 'كتلة بيضة': 'جرام', 'كتلة كيس أرز كبير': 'كيلوجرام',
  'كتلة طفل': 'كيلوجرام', 'كتلة بطيخة': 'كيلوجرام',
};
const ROUTINE_ORDER = ['الاستيقاظ من النوم', 'تنظيف الأسنان', 'تناول الفطور', 'الذهاب إلى المدرسة', 'العودة من المدرسة', 'تناول الغداء', 'أداء الواجبات', 'النوم'];
const roundHalfUp = (x, to) => Math.round(x / to) * to; // positive ints only
const clock = (h, m) => `${h}:${String(m).padStart(2, '0')}`;
const frac = (f) => `${f.num}/${f.den}`;

// ---------------------------------------------------------------- per-skill checkers

/**
 * Checkers for exercises whose correctness isn't visible as an equation.
 * Keyed by skill prefix; the longest matching prefix wins.
 * Each returns nothing and asserts.
 */
export const SKILL_CHECKERS = {
  'sci.term': (ex, d, A) => {
    const terms = SCIENCE.get(ex.lesson_id).terms;
    const t = terms.find((x) => x.term === d.term);
    A.ok(t, `unknown term ${d.term}`);
    const [shown, asked] = d.form === 'term.name' ? ['def', 'term'] : ['term', 'def'];
    A.ok(ex.prompt.includes(t[shown]), 'prompt does not show the term/definition');
    A.equal(ex.answer, t[asked]);
    for (const c of others(ex)) A.ok(terms.some((x) => x !== t && x[asked] === c), `distractor ${c} is not another term of the lesson`);
  },
  'sci.group.member': (ex, d, A) => {
    const set = SCIENCE.get(ex.lesson_id).groups[d.set];
    const cat = set.categories.find((c) => c.name === d.category);
    A.equal(ex.prompt, cat.pick);
    A.ok(cat.members.includes(ex.answer), `${ex.answer} is not in ${cat.name}`);
    for (const c of others(ex)) {
      A.ok(!cat.members.includes(c), `distractor ${c} is also in ${cat.name}`);
      A.ok(set.categories.some((k) => k.members.includes(c)), `distractor ${c} is not in the set`);
    }
  },
  'sci.group.category': (ex, d, A) => {
    const set = SCIENCE.get(ex.lesson_id).groups[d.set];
    A.ok(ex.prompt.includes(d.member));
    const home = set.categories.filter((c) => c.members.includes(d.member));
    A.equal(home.length, 1, `${d.member} is in ${home.length} categories`);
    A.equal(ex.answer, home[0].name);
    for (const c of others(ex)) A.ok(set.categories.some((k) => k.name === c), `distractor ${c} is not a category`);
  },
  'sci.seq': (ex, d, A) => {
    const { steps } = SCIENCE.get(ex.lesson_id).sequences[d.sequence];
    if (d.form === 'seq.first') A.equal(ex.answer, steps[0]);
    else {
      A.ok(ex.prompt.includes(steps[d.index]));
      A.equal(ex.answer, steps[d.index + 1]);
    }
    for (const c of others(ex)) A.ok(steps.includes(c), `distractor ${c} is not a step`);
  },
  'sci.question': (ex, d, A) => {
    const q = SCIENCE.get(ex.lesson_id).questions[d.question];
    A.equal(ex.prompt, q.q);
    A.equal(ex.answer, q.a);
    for (const c of others(ex)) A.ok(q.wrong.includes(c), `distractor ${c} is not one of the question's`);
  },
  'place_value.digit_value': (ex, d, A) => {
    A.equal(Math.floor(d.number / 10 ** d.place) % 10, d.digit);
    A.equal(num(ex.answer), d.digit * 10 ** d.place);
  },
  'place_value.digit_place': (ex, d, A) => {
    A.equal(Math.floor(d.number / 10 ** d.place) % 10, d.digit);
    A.equal(ex.answer, PLACES[d.place]);
  },
  'place_value.compose': (ex, d, A) => {
    const composed = ex.visual.places.reduce((s, p) => s + p.digit * 10 ** p.place, 0);
    A.equal(composed, d.number);
    A.equal(num(ex.answer), d.number);
  },
  'numbers.words_to_digits': (ex, d, A) => A.equal(num(ex.answer), d.number),
  'numbers.digits_to_words': (ex, d, A) => A.ok(plain(ex.prompt).includes(String(d.number))),
  'numbers.order': (ex, d, A) => {
    const sorted = [...d.numbers].sort((a, b) => (d.direction === 'asc' ? a - b : b - a));
    A.deepEqual(plain(ex.answer).split('، ').map(Number), sorted);
  },
  'numbers.round': (ex, d, A) => A.equal(num(ex.answer), roundHalfUp(d.number, d.to)),
  'numbers.pattern': (ex, d, A) => {
    d.sequence.forEach((v, i) => i && A.equal(v - d.sequence[i - 1], d.step));
    A.equal(num(ex.answer), d.sequence[d.missing_index]);
  },
  'numbers.estimate_quantity': (ex, d, A) => A.equal(num(ex.answer), roundHalfUp(d.count, 10)),
  'add.estimate': (ex, d, A) => {
    const [a, b] = d.operands;
    A.equal(num(ex.answer), roundHalfUp(a, d.to) + roundHalfUp(b, d.to));
  },
  'sub.estimate': (ex, d, A) => {
    const [a, b] = d.operands;
    A.equal(num(ex.answer), roundHalfUp(a, d.to) - roundHalfUp(b, d.to));
  },
  'sub.check_with_addition': (ex, d, A) => {
    const [a, b] = d.operands;
    A.equal(plain(ex.answer), `${a - b} + ${b} = ${a}`);
  },
  'mul.equal_groups': (ex, d, A) => A.equal(num(ex.answer), d.factors[0] * d.factors[1]),
  'div.sharing': (ex, d, A) => {
    A.equal(num(ex.answer) * d.divisor, d.dividend);
    A.equal(ex.visual.groups * ex.visual.size, d.dividend);
  },
  'frac.whole': (ex, d, A) => {
    A.equal(frac(d.answer_value), `${ex.visual.shaded}/${ex.visual.parts}`);
    A.equal(plain(ex.answer), frac(d.answer_value));
  },
  'frac.equal_one.pick': (ex, d, A) => A.equal(d.answer_value.num, d.answer_value.den),
  'frac.set.fraction': (ex, d, A) => A.equal(frac(d.answer_value), `${ex.visual.highlighted}/${ex.visual.total}`),
  'frac.set.count': (ex, d, A) => A.equal(num(ex.answer), (d.total / d.den) * d.num),
  'money.count': (ex, d, A) => A.equal(num(ex.answer), ex.visual.items.reduce((s, i) => s + i.value, 0)),
  'money.word': (ex, d, A) => A.equal(num(ex.answer), d.items[0] + d.items[1]),
  'time.read': (ex, d, A) => {
    const a = plain(ex.answer);
    if (/^\d/.test(a)) A.equal(a, clock(d.hour, d.minute));
    else A.equal(a, timeInWords(d.hour, d.minute));
    A.equal(ex.visual.hour, d.hour);
    A.equal(ex.visual.minute, d.minute);
  },
  'time.estimate': (ex, d, A) => A.ok(ex.answer.includes({ دقيقة: 'دقائق', ساعة: 'ساعات', يوم: 'أيام', سنة: 'سنوات' }[d.unit])),
  'time.sequence': (ex, d, A) => {
    const [x, y] = d.events.map((e) => ROUTINE_ORDER.indexOf(e));
    const first = x < y ? d.events[0] : d.events[1];
    A.equal(ex.answer, ex.prompt.includes('أولًا') ? first : d.events.find((e) => e !== first));
  },
  'length.nonstandard': (ex, d, A) => A.equal(num(ex.answer), Math.abs(d.lengths[0] - d.lengths[1])),
  'length.ruler': (ex, d, A) => A.equal(num(ex.answer), ex.visual.end - ex.visual.start),
  'measure.convert': (ex, d, A) => {
    const factor = { m_cm: 100, cm_mm: 10, km_m: 1000, l_ml: 1000, kg_g: 1000 }[d.conversion];
    A.equal(num(ex.answer), d.value * factor);
  },
  'measure.unit': (ex, d, A) => A.equal(ex.answer, UNIT_OK[d.item]),
  'measure.nonstandard': (ex, d, A) => {
    const [[n1, v1], [n2, v2]] = Object.entries(d.values);
    A.equal(ex.answer, v1 > v2 ? n1 : n2);
  },
  'area.compare': (ex, d, A) => {
    const areas = ex.visual.shapes.map((s) => s.rows * s.cols);
    A.equal(ex.answer, areas[0] > areas[1] ? 'الشكل الأحمر' : 'الشكل الأزرق');
  },
  'area.count': (ex, d, A) => {
    const v = ex.visual;
    A.equal(v.half_squares % 2, 0, 'odd number of half squares');
    A.equal(num(ex.answer), v.rows * v.cols + (v.attached ? v.attached.rows * v.attached.cols : 0) + v.half_squares / 2);
  },
  perimeter: (ex, d, A) => A.equal(num(ex.answer), d.sides.reduce((s, x) => s + x, 0)),
  'volume.count_cubes': (ex, d, A) => A.equal(num(ex.answer), d.dims[0] * d.dims[1] * d.dims[2]),
  'geo.solids.rolls': (ex, d, A) => {
    A.ok(ROLLS.has(ex.answer));
    for (const c of ex.choices) if (c !== ex.answer) A.ok(!ROLLS.has(c), `two rolling solids: ${ex.choices}`);
  },
  'geo.solids.name': (ex, d, A) => A.equal(ex.answer, ex.visual.solid),
  'geo.solids': (ex, d, A) => {
    const [f, e, v] = SOLID_FACTS[d.solid];
    A.equal(f - e + v, 2); // Euler, sanity-checks the table itself
    A.equal(num(ex.answer), { faces: f, edges: e, vertices: v }[d.attribute]);
  },
  'geo.plane.name_from_sides': (ex, d, A) => {
    A.equal(SIDES[ex.answer], d.sides);
    for (const c of ex.choices) if (c !== ex.answer) A.notEqual(SIDES[c], d.sides);
  },
  'geo.plane.identify': (ex, d, A) => A.equal(ex.answer, ex.visual.shape),
  'geo.plane': (ex, d, A) => A.equal(num(ex.answer), SIDES[d.shape]),
  'geo.symmetry.count_axes': (ex, d, A) => A.equal(num(ex.answer), AXES[d.shape]),
  'add.property': (ex, d, A) => {
    // fill-in variants are verified by equation substitution; this covers 'name the property'
    if (ex.skill.endsWith('.name')) A.equal(ex.answer, PROPERTY[d.property]);
  },
  'measure.estimate': (ex, d, A) => {
    A.equal(UNIT_OK[d.item], d.unit);
    A.equal(plain(ex.answer), `${d.value} ${ABBR[d.unit]}`);
  },
  'frac.order': (ex, d, A) => {
    const v = (f) => f.num / f.den;
    const sorted = [...d.fractions].sort((p, q) => (d.direction === 'asc' ? v(p) - v(q) : v(q) - v(p)));
    A.equal(plain(ex.answer), sorted.map(frac).join('، '));
  },
  'chance.describe': (ex, d, A) => {
    const k = d.bag[d.draw];
    const other = Object.values(d.bag).reduce((a, b) => a + b, 0) - k;
    const expect = other === 0 ? 'أكيد' : k === 0 ? 'مستحيل' : k > other ? 'أكثر احتمالًا' : 'أقل احتمالًا';
    A.notEqual(k, other, 'equally likely has no single answer');
    A.equal(ex.answer, expect);
  },
  'geo.compare': (ex, d, A) => {
    const most = ex.skill.includes('most');
    const best = [...d.shapes].sort((a, b) => (most ? SIDES[b.shape] - SIDES[a.shape] : SIDES[a.shape] - SIDES[b.shape]))[0];
    A.equal(ex.answer, best.shape);
  },
  'geo.compose': (ex, d, A) => {
    const known = { 'شكل سداسي': [6, 2], 'شبه منحرف': [3], 'مستطيل من صفين وعمودين': [4], 'مستطيل طوله ضعف عرضه': [2], 'مربع (بقطع المربع من قطره)': [2] };
    A.ok(known[d.whole].includes(num(ex.answer)));
  },
  'geo.pattern': (ex, d, A) => {
    const u = d.unit.length;
    d.sequence.forEach((s, i) => i >= u && A.equal(s, d.sequence[i - u]));
    A.equal(ex.answer, d.sequence[d.missing_index]);
  },
  'geo.symmetry': (ex, d, A) => A.equal(ex.answer, HAS_SYMMETRY[d.shape] ? 'نعم' : 'لا'),
  'data.': (ex, d, A) => {
    const rows = d.rows;
    const s = ex.skill;
    if (s.endsWith('.value')) A.equal(num(ex.answer), rows.find((r) => r.label === d.asked).value);
    else if (s.endsWith('.total')) A.equal(num(ex.answer), rows.reduce((t, r) => t + r.value, 0));
    else if (s.endsWith('.difference')) {
      const [a, b] = d.compare.map((l) => rows.find((r) => r.label === l).value);
      A.equal(num(ex.answer), a - b);
    } else {
      const vals = rows.map((r) => r.value);
      const target = s.endsWith('.most') ? Math.max(...vals) : Math.min(...vals);
      A.equal(ex.answer, rows.find((r) => r.value === target).label);
    }
    // the visual must encode the same data
    const v = ex.visual;
    if (v.kind === 'pictograph') v.rows.forEach((r, i) => A.equal(r.symbols * v.key, rows[i].value));
    if (v.kind === 'bar_graph') v.bars.forEach((b, i) => A.equal(b.value % v.axis_step, 0));
  },
  'chance.certain_impossible': (ex, d, A) => {
    const total = Object.values(d.bag).reduce((a, b) => a + b, 0);
    const k = d.bag[d.draw] ?? 0;
    const kind = k === 0 ? 'impossible' : k === total ? 'certain' : 'possible';
    A.ok(['مستحيل'].includes(ex.answer) === (kind === 'impossible'));
    A.ok(['أكيد', 'مؤكد'].includes(ex.answer) === (kind === 'certain'));
  },
  'chance.': (ex, d, A) => {
    const [[c1, a], [c2, b]] = Object.entries(d.bag);
    const more = ex.skill.includes('more');
    const pick = (a > b) === more ? c1 : c2;
    A.ok(ex.answer.endsWith(pick.replace('ال', '')), `${ex.answer} vs ${pick}`);
  },
  'word.add': (ex, d, A) => A.equal(num(ex.answer), d.operands[0] + d.operands[1]),
  'word.sub': (ex, d, A) => A.equal(num(ex.answer), d.operands[0] - d.operands[1]),
  'word.choose_operation': (ex, d, A) => {
    A.equal(ex.answer, OP_WORD[d.op]);
    const [a, b] = d.operands;
    const expect = { add: a + b, sub: a - b, mul: a * b, div: a / b }[d.op];
    A.equal(d.story_answer, expect);
  },
  'word.number_sentence': (ex, d, A) => {
    const [a, b] = d.operands;
    A.equal(plain(ex.answer), d.op === 'add' ? `${a} + ${b} = ${a + b}` : `${a} - ${b} = ${a - b}`);
  },
  'word.logic': (ex, d, A) => {
    A.equal(num(ex.answer), d.tens * 10 + d.ones);
    A.ok(d.ones <= 9 && d.tens >= 1);
  },
  'word.guess_check': (ex, d, A) => {
    const [big, small] = d.numbers;
    A.equal(big + small, d.sum);
    A.equal(big - small, d.diff);
    A.equal(num(ex.answer), ex.prompt.includes('الأكبر') ? big : small);
  },
  'word.work_backward': (ex, d, A) => {
    A.equal(num(ex.answer) - d.gave + d.got, d.end);
  },
  'word.make_table.total': (ex, d, A) => A.equal(num(ex.answer), d.rate * d.days),
  'word.make_table.days': (ex, d, A) => A.equal(num(ex.answer) * d.rate, d.rate * d.days),
  'word.find_pattern.numbers': (ex, d, A) => {
    const last = d.sequence[d.sequence.length - 1];
    A.equal(num(ex.answer), last);
    A.equal(last, d.sequence[0] + (d.sequence.length - 1) * d.step);
  },
  'word.find_pattern.time': (ex, d, A) => {
    const mins = d.times.map(([h, m]) => h * 60 + m);
    mins.forEach((m, i) => i && A.equal(m - mins[i - 1], d.step_minutes));
    A.equal(plain(ex.answer), clock(...d.times[4]));
  },
  'word.make_list.digits': (ex, d, A) => {
    // brute-force enumerate two-digit numbers with different digits
    const set = new Set();
    for (const x of d.digits) for (const y of d.digits) if (x !== y) set.add(x * 10 + y);
    A.equal(num(ex.answer), set.size);
  },
  'word.make_list.combos': (ex, d, A) => {
    const list = [];
    for (let i = 0; i < d.a; i++) for (let j = 0; j < d.b; j++) list.push([i, j]);
    A.equal(num(ex.answer), list.length);
  },
  'word.two_step': (ex, d, A) => A.equal(num(ex.answer), d.operands[0] + d.operands[1] - d.operands[2]),
  'word.exact_or_estimate': (ex, d, A) => {
    A.equal(ex.answer, d.exact ? 'جواب دقيق' : 'جواب تقديري');
    A.equal(d.exact, ex.prompt.includes('بالضبط'));
  },
  'word.reasonable': (ex, d, A) => {
    const [a, b] = d.operands;
    const actual = d.op === 'sub' ? a - b : a + b;
    A.equal(ex.answer, Math.abs(d.claim - actual) <= 10 ? 'نعم' : 'لا');
  },
  'word.extra_information': (ex, d, A) => A.ok(ex.answer.startsWith('عمر')),
  'word.simpler_problem': (ex, d, A) => {
    // count seats directly: each table has 4 sides, joined tables lose 2 seats per joint
    A.equal(num(ex.answer), 4 * d.tables - 2 * (d.tables - 1));
  },
  'word.draw_picture.fraction_of_set': (ex, d, A) => A.equal(num(ex.answer), d.total / d.den),
  'word.draw_picture': (ex, d, A) => {
    const num_ = ex.skill.endsWith('eaten') ? d.eaten : d.den - d.eaten;
    A.equal(frac(d.answer_value), `${num_}/${d.den}`);
    A.equal(plain(ex.answer), frac(d.answer_value));
  },
};

export function findSkillChecker(skill) {
  const keys = Object.keys(SKILL_CHECKERS).filter((k) => skill === k || skill.startsWith(k));
  keys.sort((a, b) => b.length - a.length);
  return keys.length ? SKILL_CHECKERS[keys[0]] : null;
}
