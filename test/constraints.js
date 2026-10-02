// Per-generator constraint checks: every generated exercise must stay inside
// the limits its lesson declares in curriculum.json (ranges, regrouping policy,
// which tables/denominators are allowed...). Keyed by generator key.
// Carry/borrow detection is re-implemented here independently of the generators.
import { plain } from './checkers.js';

const ABBR = { ملمتر: 'ملم', سنتمتر: 'سم', متر: 'م', كيلومتر: 'كم', ملّتر: 'مل', لتر: 'ل', جرام: 'جم', كيلوجرام: 'كجم' };

const inR = (x, [lo, hi]) => x >= lo && x <= hi;
const numAns = (ex) => Number(plain(ex.answer));

function carries(a, b) {
  const s = String(a).padStart(6, '0');
  const t = String(b).padStart(6, '0');
  let c = 0;
  const places = [];
  for (let i = 5; i >= 0; i--) {
    const d = Number(s[i]) + Number(t[i]) + c;
    c = d >= 10 ? 1 : 0;
    places.push(c === 1);
  }
  return places; // [ones->tens carry, tens->hundreds carry, ...]
}
function borrows(a, b) {
  const s = String(a).padStart(6, '0');
  const t = String(b).padStart(6, '0');
  let br = 0;
  const places = [];
  for (let i = 5; i >= 0; i--) {
    const d = Number(s[i]) - br - Number(t[i]);
    br = d < 0 ? 1 : 0;
    places.push(br === 1);
  }
  return places; // [borrow from tens, borrow from hundreds, ...]
}
function policyOk(policy, any) {
  return policy === 'none' ? !any : policy === 'required' ? any : true;
}

const operandPairOk = (A, [x, y], p) => {
  const inA = (v) => inR(v, p.a) && (!p.multiple_of || v % p.multiple_of === 0);
  const inB = (v) => (p.b_values ? p.b_values.includes(v) : inR(v, p.b) && (!p.multiple_of || v % p.multiple_of === 0));
  A.ok((inA(x) && inB(y)) || (!p.b_values && inA(y) && inB(x)), `operands ${x}, ${y} outside a=${p.a} b=${p.b ?? p.b_values}`);
};

export const CONSTRAINTS = {
  'sci.quiz': (ex, p, A) => {
    if (p.forms) A.ok(p.forms.includes(ex.data.form), `form ${ex.data.form} not in ${p.forms}`);
    // term → definition and level-2 questions are kept out of the first tier
    if ((p.level ?? 1) < 2) A.notEqual(ex.data.form, 'term.meaning');
  },
  'num.place_value': (ex, p, A) => {
    const x = ex.data.number ?? ex.data.terms.reduce((s, t) => s + t, 0);
    A.ok(inR(x, p.range), `${x} not in ${p.range}`);
    if (p.multiple_of) A.equal(x % p.multiple_of, 0);
  },
  'num.read_write': (ex, p, A) => A.ok(inR(ex.data.number, p.range)),
  'num.compare': (ex, p, A) => {
    A.ok(inR(ex.data.a, p.range) && inR(ex.data.b, p.range));
    if (p.close && ex.data.a !== ex.data.b) A.equal(String(ex.data.a).length, String(ex.data.b).length);
  },
  'num.order': (ex, p, A) => {
    A.equal(ex.data.numbers.length, p.count ?? 3);
    ex.data.numbers.forEach((v) => A.ok(inR(v, p.range)));
  },
  'num.round': (ex, p, A) => {
    A.ok(inR(ex.data.number, p.range));
    A.ok(p.to.includes(ex.data.to));
  },
  'num.pattern': (ex, p, A) => {
    const { sequence: s, step } = ex.data;
    A.ok(p.steps.includes(Math.abs(step)));
    A.ok((p.directions ?? ['up']).includes(step > 0 ? 'up' : 'down'));
    A.ok(inR(s[0], p.start));
    s.forEach((v) => A.ok(v >= 0 && v <= (p.max ?? Infinity), `${v} outside 0..${p.max}`));
  },
  'num.estimate_quantity': (ex, p, A) => A.ok(inR(ex.data.count, p.range)),

  'add.facts': (ex, p, A) => {
    const [a, b] = ex.data.operands;
    const maxA = p.max_addend ?? 9;
    A.ok(a + b <= (p.max_sum ?? 18), `sum ${a + b} > ${p.max_sum}`);
    if (p.mode === 'count_on') A.ok(inR(b, [1, 3]) && a <= maxA);
    if (p.mode === 'doubles') A.ok(a === b && a <= maxA);
    if (p.mode === 'near_doubles') A.ok(Math.abs(a - b) === 1 && Math.max(a, b) <= maxA);
    if (p.mode === 'make_ten') A.ok(a + b > 10 && inR(a, [7, 9]) && b <= 9);
    if (p.mode === 'any') A.ok(a <= maxA && b <= maxA);
  },
  'add.properties': (ex, p, A) => {
    A.ok(p.properties.includes(ex.data.property));
    A.ok((p.ask ?? ['fill']).includes(ex.skill.endsWith('.name') ? 'name' : 'fill'));
    ex.data.operands.filter((x) => x !== 0).forEach((x) => A.ok(inR(x, p.range)));
  },
  'add.three': (ex, p, A) => {
    const ops = ex.data.operands;
    ops.forEach((x) => A.ok(inR(x, p.range)));
    A.ok(ops[0] + ops[1] + ops[2] <= (p.max_sum ?? Infinity));
    A.ok(policyOk(p.regroup ?? 'any', ops.reduce((s, x) => s + (x % 10), 0) >= 10));
  },
  'add.column': (ex, p, A) => {
    const [a, b] = ex.data.operands;
    operandPairOk(A, [a, b], p);
    A.ok(a + b <= (p.max_sum ?? Infinity), `sum ${a + b} > ${p.max_sum}`);
    const c = carries(a, b);
    A.ok(policyOk(p.regroup, c.some(Boolean)), `regroup policy ${p.regroup} violated by ${a}+${b}`);
    if (p.regroup_place === 'ones') A.ok(c[0] && !c[1]);
    if (p.regroup_place === 'tens') A.ok(!c[0] && c[1]);
    if (p.regroup_place === 'both') A.ok(c[0] && c[1]);
  },
  'add.estimate': (ex, p, A) => {
    const [a, b] = ex.data.operands;
    A.ok(inR(a, p.a) && inR(b, p.b));
    A.equal(ex.data.to, p.to);
    if (p.max_sum) A.ok(numAns(ex) <= p.max_sum && a + b <= p.max_sum);
  },

  'sub.facts': (ex, p, A) => {
    const [a, b] = ex.data.operands;
    A.ok(a <= (p.max_minuend ?? 18) && b <= a);
    if (p.mode === 'count_back') A.ok(inR(b, [1, 3]));
    if (p.mode === 'zero_all') A.ok(b === 0 || b === a);
    if (p.mode === 'doubles') A.equal(a, 2 * b);
  },
  'sub.related': (ex, p, A) => A.ok(ex.data.family[2] <= p.max_sum),
  'sub.missing': (ex, p, A) => A.ok(ex.data.sentence.s <= p.max),
  'sub.column': (ex, p, A) => {
    const [a, b] = ex.data.operands;
    A.ok(inR(a, p.a) && (!p.multiple_of || a % p.multiple_of === 0), `minuend ${a} outside ${p.a}`);
    A.ok(p.b_values ? p.b_values.includes(b) : inR(b, p.b), `subtrahend ${b} outside ${p.b}`);
    A.ok(a > b);
    const br = borrows(a, b);
    A.ok(policyOk(p.regroup, br.some(Boolean)), `regroup policy ${p.regroup} violated by ${a}-${b}`);
    if (p.regroup_place === 'tens') A.ok(br[0] && !br[1]);
    if (p.regroup_place === 'hundreds') A.ok(!br[0] && br[1]);
    if (p.zeros) A.equal(Math.floor(a / 10) % 10, 0);
  },
  'sub.check': (ex, p, A) => A.ok(inR(ex.data.operands[0], p.a) && inR(ex.data.operands[1], p.b)),
  'sub.estimate': (ex, p, A) => {
    const [a, b] = ex.data.operands;
    A.ok(inR(a, p.a) && inR(b, p.b));
    A.ok(numAns(ex) > 0);
  },

  'mul.equal_groups': (ex, p, A) => {
    const [g, s] = ex.data.factors;
    A.ok(inR(g, p.groups) && inR(s, p.size));
  },
  'mul.array': (ex, p, A) => {
    const [r, c] = ex.data.factors;
    A.ok(inR(r, p.rows) && inR(c, p.cols));
  },
  'mul.facts': (ex, p, A) => {
    const [a, b] = ex.data.factors;
    A.ok(
      (p.tables.includes(a) && inR(b, p.other)) || (p.tables.includes(b) && inR(a, p.other)),
      `${a}×${b} not in tables ${p.tables} × ${p.other}`,
    );
  },
  'mul.associative': (ex, p, A) => {
    const [a, b, c] = ex.data.factors;
    A.ok(a * b <= 10 && b * c <= 10, 'intermediate product beyond known facts');
  },

  'div.sharing': (ex, p, A) => {
    A.ok(p.divisors.includes(ex.data.divisor));
    A.ok(inR(ex.data.dividend / ex.data.divisor, p.quotient));
  },
  'div.repeated_subtraction': (ex, p, A) => CONSTRAINTS['div.sharing'](ex, p, A),
  'div.fact_family': (ex, p, A) => CONSTRAINTS['div.sharing'](ex, p, A),
  'div.facts': (ex, p, A) => CONSTRAINTS['div.sharing'](ex, p, A),
  'div.zero_one': (ex, p, A) => {
    A.notEqual(ex.data.divisor, 0, 'division by zero');
    A.ok(inR(Math.max(ex.data.dividend, ex.data.divisor), p.range));
  },

  'frac.part_of_whole': (ex, p, A) => {
    A.ok(p.denominators.includes(ex.visual.parts));
    if (p.numerators === 'unit') A.equal(ex.visual.shaded, 1);
    A.ok(ex.visual.shaded < ex.visual.parts);
    A.ok(p.models.includes(ex.visual.model));
  },
  'frac.equal_one': (ex, p, A) => A.ok(p.denominators.includes(ex.data.den)),
  'frac.compare': (ex, p, A) => {
    const { a, b } = ex.data;
    A.ok(p.denominators.includes(a.den) && p.denominators.includes(b.den));
    const kinds = [];
    if (a.num === 1 && b.num === 1) kinds.push('unit');
    if (a.den === b.den) kinds.push('same_den');
    if (a.den !== b.den && (a.den % b.den === 0 || b.den % a.den === 0)) kinds.push('related');
    A.ok(kinds.some((k) => p.modes.includes(k)), `pair ${a.num}/${a.den}, ${b.num}/${b.den} not of kind ${p.modes}`);
  },
  'frac.order': (ex, p, A) => {
    const fr = ex.data.fractions;
    fr.forEach((f) => A.ok(p.denominators.includes(f.den) && f.num < f.den));
    A.equal(new Set(fr.map((f) => f.num / f.den)).size, 3, 'two fractions are equal');
  },
  'frac.of_set': (ex, p, A) => A.ok(p.denominators.includes(ex.data.den)),
  'frac.equivalent': (ex, p, A) => {
    A.ok(p.denominators.includes(ex.data.left.den));
    A.ok(ex.data.right.den <= p.max_den);
    A.ok((p.blanks ?? ['right_num']).includes(ex.data.blank));
  },

  'money.count': (ex, p, A) => {
    const items = ex.data.items;
    items.forEach((v) => A.ok(p.denominations.includes(v)));
    A.ok(inR(items.length, p.count));
    A.ok(items.reduce((s, x) => s + x, 0) <= p.max_total);
  },
  'money.word': (ex, p, A) => {
    ex.data.items.forEach((v) => A.ok(p.denominations.includes(v)));
    A.ok(numAns(ex) <= p.max_total);
  },
  'time.read_clock': (ex, p, A) => {
    A.equal(ex.data.minute % p.minute_step, 0);
    A.ok(inR(ex.data.hour, [1, 12]));
  },
  'time.estimate': (ex, p, A) => A.ok((p.units ?? ['دقيقة', 'ساعة', 'يوم', 'سنة']).includes(ex.data.unit)),
  'time.sequence': () => {},
  'length.nonstandard': (ex, p, A) => ex.data.lengths.forEach((v) => A.ok(inR(v, p.range))),
  'length.ruler': (ex, p, A) => {
    A.ok(ex.visual.end <= p.max_cm);
    if (!p.offset) A.equal(ex.visual.start, 0);
  },
  'measure.convert': (ex, p, A) => {
    A.ok(p.conversions.includes(ex.data.conversion));
    A.ok(inR(ex.data.value, [1, p.max_whole]));
  },
  'measure.choose_unit': (ex, p, A) => {
    const taught = (c) => p.units.some((u) => c === u || c.endsWith(' ' + ABBR[u]));
    ex.choices.forEach((c) => A.ok(taught(plain(c)), `unit ${c} not taught`));
    A.ok((p.ask ?? ['unit']).some((a) => ex.skill.startsWith(`measure.${a}`)));
  },
  'measure.nonstandard_compare': (ex, p, A) => Object.values(ex.data.values).forEach((v) => A.ok(inR(v, p.range))),
  'area.units': (ex, p, A) => {
    const shapes = ex.visual.shapes ?? [ex.visual];
    shapes.forEach((s) => A.ok(inR(s.rows, p.rows) && inR(s.cols, p.cols)));
    if (!p.composite && ex.visual.kind === 'grid_area') A.equal(ex.visual.attached, null);
    if (!p.halves && ex.visual.kind === 'grid_area') A.equal(ex.visual.half_squares, 0);
  },
  perimeter: (ex, p, A) => {
    A.ok(p.shapes.includes(ex.data.shape));
    ex.data.sides.forEach((s) => A.ok(inR(s, p.side)));
  },
  'volume.cubes': (ex, p, A) => ex.data.dims.forEach((d) => A.ok(inR(d, p.dims))),

  'geo.solids': (ex, p, A) => {
    const used = [ex.data.solid, ...(ex.choices ?? [])].filter((s) => s && !/\d/.test(plain(s)));
    used.forEach((s) => A.ok(p.solids.includes(s), `${s} not in lesson`));
  },
  'geo.plane': (ex, p, A) => {
    if (ex.data.shape) A.ok(p.shapes.includes(ex.data.shape));
    if (ex.choices && !/\d/.test(plain(ex.answer))) ex.choices.forEach((c) => A.ok(p.shapes.includes(c), `shape ${c} not in lesson`));
    const askOf = ex.skill.split('.').pop().replace('name_from_sides', 'name');
    A.ok(p.ask.includes(askOf), `ask ${askOf} not in ${p.ask}`);
    if (ex.skill.endsWith('corners') || ex.skill.endsWith('name_from_sides')) {
      const word = (p.corner ?? 'vertices') === 'angles' ? 'زاوية' : 'رأس';
      A.ok(ex.prompt.includes(word === 'رأس' ? (ex.skill.endsWith('corners') ? 'رأسًا' : 'رؤوس') : (ex.skill.endsWith('corners') ? 'زاوية' : 'زوايا')), 'corner word does not match lesson');
    }
  },
  'geo.compare_shapes': (ex, p, A) => ex.data.shapes.forEach((s) => A.ok(p.shapes.includes(s.shape))),
  'geo.compose': () => {},
  'geo.pattern': (ex, p, A) => A.ok(p.units.includes(ex.data.unit_name)),
  'geo.symmetry': (ex, p, A) => A.ok((p.ask ?? ['has_axis']).includes(ex.skill.split('.').pop())),

  'data.tally': (ex, p, A) => dataOk(ex, p, A),
  'data.pictograph': (ex, p, A) => {
    dataOk(ex, p, A);
    A.ok(p.keys.includes(ex.visual.key));
    ex.visual.rows.forEach((r) => A.ok(Number.isInteger(r.symbols), 'half symbols are not taught'));
  },
  'data.bar_graph': (ex, p, A) => {
    dataOk(ex, p, A);
    A.ok(p.scale.includes(ex.visual.axis_step));
  },
  'data.chance': (ex, p, A) => {
    const terms = Object.values(p.terms);
    if (p.mode === 'describe4') {
      A.equal(ex.skill, 'chance.describe');
      A.deepEqual([...ex.choices].sort(), [p.terms.certain, p.terms.more, p.terms.less, p.terms.impossible].sort());
      return;
    }
    if (ex.skill === 'chance.certain_impossible') {
      ex.choices.forEach((c) => A.ok(terms.includes(c), `term ${c} not in lesson vocabulary`));
      if (!p.allow_possible) A.ok(!ex.choices.includes(p.terms.possible));
    }
    if (p.mode === 'certain_impossible') A.equal(ex.skill, 'chance.certain_impossible');
    if (p.mode === 'more_less_likely') A.notEqual(ex.skill, 'chance.certain_impossible');
  },

  'word.add_sub': (ex, p, A) => storyOk(ex, p, A),
  'word.number_sentence': (ex, p, A) => storyOk(ex, p, A),
  'word.choose_operation': (ex, p, A) => A.ok(p.ops.includes(ex.data.op)),
  'word.logic_number': (ex, p, A) => A.ok((p.variants ?? ['diff', 'sum']).some((v) => ex.skill.endsWith(v))),
  'word.guess_check': (ex, p, A) => A.ok(ex.data.sum <= p.max_sum),
  'word.work_backward': (ex, p, A) => {
    const { start, gave, got, end } = ex.data;
    A.ok(inR(start, p.range));
    [start, gave, got, end, start - gave].forEach((v) => A.ok(v >= 0 && v <= (p.max ?? p.range[1])));
  },
  'word.make_table': (ex, p, A) => {
    A.ok(p.rates.includes(ex.data.rate));
    A.ok(inR(ex.data.days, p.days));
    A.ok(p.ask.some((a) => ex.skill.endsWith(a)));
  },
  'word.find_pattern': (ex, p, A) => A.ok(p.steps.includes(ex.data.step ?? ex.data.step_minutes)),
  'word.make_list': (ex, p, A) => {
    if (p.mode === 'digits') A.ok((p.digits ?? [3]).includes(ex.data.digits.length));
    else A.ok(inR(ex.data.a, p.combos) && inR(ex.data.b, p.combos));
  },
  'word.two_step': (ex, p, A) => A.ok(inR(ex.data.operands[0], p.range)),
  'word.exact_or_estimate': (ex, p, A) => ex.data.operands.forEach((v) => A.ok(inR(v, p.range))),
  'word.reasonable': (ex, p, A) => ex.data.operands.forEach((v) => A.ok(inR(v, p.range))),
  'word.extra_info': (ex, p, A) => A.ok(inR(ex.data.boxes, p.factor) && inR(ex.data.per_box, p.factor)),
  'word.simpler_problem': (ex, p, A) => A.ok(inR(ex.data.tables, p.tables)),
  'word.draw_picture_fraction': (ex, p, A) => {
    A.ok(p.denominators.includes(ex.data.den));
    A.ok(p.ask.some((a) => ex.skill.endsWith(a) || (a === 'count' && ex.skill.endsWith('fraction_of_set'))));
  },
};

function dataOk(ex, p, A) {
  ex.data.rows.forEach((r) => A.ok(r.value >= 1 && r.value <= p.max, `${r.value} > ${p.max}`));
  if (p.ask) A.ok(p.ask.some((a) => ex.skill.endsWith(`.${a}`)));
}

function storyOk(ex, p, A) {
  const [a, b] = ex.data.operands;
  A.ok(inR(a, p.range) && inR(b, p.range), `${a}, ${b} outside ${p.range}`);
  if (ex.data.op === 'add') A.ok(a + b <= (p.max ?? Infinity));
  else A.ok(a > b);
  const policy = p.regroup ?? 'any';
  A.ok(policyOk(policy, ex.data.op === 'add' ? carries(a, b).some(Boolean) : borrows(a, b).some(Boolean)));
}
