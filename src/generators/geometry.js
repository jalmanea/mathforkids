// Geometry: solids, plane shapes, comparing/composing shapes, shape patterns, symmetry.
import { n } from '../core/digits.js';
import { numericMC, stringMC, sampleUntil } from './common.js';

// Names as printed in the books: grade 2 (10-1) uses هرم, grade 3 (9-1) uses هرم رباعي;
// both use متوازي مستطيلات. Face/edge/vertex counts are asked for polyhedra only.
export const SOLIDS = {
  مكعب: { faces: 6, edges: 12, vertices: 8, rolls: false },
  'متوازي مستطيلات': { faces: 6, edges: 12, vertices: 8, rolls: false },
  هرم: { faces: 5, edges: 8, vertices: 5, rolls: false }, // square-based, as pictured in grade 2
  'هرم رباعي': { faces: 5, edges: 8, vertices: 5, rolls: false },
  أسطوانة: { rolls: true },
  مخروط: { rolls: true },
  كرة: { rolls: true },
};
/** "هرم رباعي" -> "الهرم الرباعي", "متوازي مستطيلات" -> "متوازي المستطيلات", "شبه منحرف" -> "شبه المنحرف". */
export function definite(name) {
  // Construct phrases (إضافة): only the second word takes ال.
  for (const head of ['شبه ', 'متوازي ']) {
    if (name.startsWith(head)) return `${head}ال${name.slice(head.length)}`;
  }
  return name
    .split(' ')
    .map((w) => (w.startsWith('ال') || w.startsWith('(') ? w : `ال${w}`))
    .join(' ');
}
/** Prefix the preposition لِـ: "للمكعب", "لشبه المنحرف". */
const li = (name) => {
  const d = definite(name);
  return d.startsWith('ال') ? `لل${d.slice(2)}` : `ل${d}`;
};

const ATTR_Q = { faces: 'وجهًا', edges: 'حرفًا', vertices: 'رأسًا' };

/**
 * Solids.
 * params: { solids:string[], ask:('faces'|'edges'|'vertices'|'name'|'rolls')[] }
 */
function solids(ctx) {
  const { rng, params } = ctx;
  const ask = rng.pick(params.ask);
  if (ask === 'rolls') {
    const rollers = params.solids.filter((s) => SOLIDS[s].rolls);
    const answer = rng.pick(rollers);
    return stringMC(ctx, {
      skill: 'geo.solids.rolls',
      prompt: 'أي المجسمات الآتية يمكن أن يتدحرج؟',
      answer,
      wrong: params.solids.filter((s) => !SOLIDS[s].rolls),
      data: { answer_value: answer },
    });
  }
  const poly = params.solids.filter((s) => !SOLIDS[s].rolls);
  if (ask === 'name') {
    const answer = rng.pick(poly);
    return stringMC(ctx, {
      skill: 'geo.solids.name',
      type: 'visual',
      prompt: 'ما اسم هذا المجسم؟',
      answer,
      wrong: params.solids.filter((s) => s !== answer),
      visual: { kind: 'solid', solid: answer },
      data: { answer_value: answer },
    });
  }
  const s = rng.pick(poly);
  const val = SOLIDS[s][ask];
  const others = ['faces', 'edges', 'vertices'].filter((k) => k !== ask).map((k) => SOLIDS[s][k]);
  return numericMC(ctx, {
    skill: `geo.solids.${ask}`,
    type: 'visual',
    prompt: `كم ${ATTR_Q[ask]} ${li(s)}؟`,
    answer: val,
    mistakes: [...others, val + 1, val - 1],
    choiceOpts: { min: 1 },
    visual: { kind: 'solid', solid: s, highlight: ask },
    data: { solid: s, attribute: ask, answer_value: val },
  });
}

export const PLANE = {
  دائرة: 0,
  مثلث: 3,
  مربع: 4,
  مستطيل: 4,
  'شكل رباعي': 4,
  'متوازي أضلاع': 4,
  'شبه منحرف': 4,
  'شكل خماسي': 5,
  'شكل سداسي': 6,
  'شكل ثماني': 8,
};

// Grade 2 counts أضلاع و رؤوس; grade 3 (9-2) counts أضلاع و زوايا.
const CORNER = {
  vertices: { q: 'رأسًا', plural: 'رؤوس' },
  angles: { q: 'زاوية', plural: 'زوايا' },
};

/**
 * Plane shapes: sides/corners, or name from sides.
 * params: { shapes:string[], ask:('sides'|'corners'|'name'|'identify')[], corner?: 'vertices'|'angles' }
 */
function plane(ctx) {
  const { rng, params } = ctx;
  const ask = rng.pick(params.ask);
  const corner = CORNER[params.corner ?? 'vertices'];
  const polygons = params.shapes.filter((s) => PLANE[s] > 0);
  if (ask === 'identify') {
    const answer = rng.pick(params.shapes);
    return stringMC(ctx, {
      skill: 'geo.plane.identify',
      type: 'visual',
      prompt: 'ما اسم هذا الشكل؟',
      answer,
      wrong: rng.shuffle(params.shapes.filter((s) => s !== answer)),
      visual: { kind: 'plane_shape', shape: answer },
      data: { shape: answer, answer_value: answer },
    });
  }
  if (ask === 'name') {
    const unique = polygons.filter((s) => polygons.filter((t) => PLANE[t] === PLANE[s]).length === 1);
    const answer = rng.pick(unique);
    return stringMC(ctx, {
      skill: 'geo.plane.name_from_sides',
      prompt: `ما الشكل الذي له ${n(PLANE[answer])} أضلاع و${n(PLANE[answer])} ${corner.plural}؟`,
      answer,
      wrong: polygons.filter((s) => PLANE[s] !== PLANE[answer]),
      data: { sides: PLANE[answer], answer_value: answer },
    });
  }
  const shape = rng.pick(params.shapes);
  const k = PLANE[shape];
  return numericMC(ctx, {
    skill: `geo.plane.${ask}`,
    type: 'visual',
    prompt: `كم ${ask === 'sides' ? 'ضلعًا' : corner.q} ${li(shape)}؟`,
    answer: k,
    mistakes: [k + 1, k - 1, k * 2, k + 2, 4],
    choiceOpts: { min: 0 },
    visual: { kind: 'plane_shape', shape },
    data: { shape, attribute: ask, answer_value: k },
  });
}

/** Compare shapes: which has more sides / which pair has the same number of sides. params: { shapes:string[] } */
function compareShapes(ctx) {
  const { rng, params } = ctx;
  const opts = sampleUntil(
    () => rng.sample(params.shapes, 3),
    (arr) => new Set(arr.map((s) => PLANE[s])).size === 3,
  );
  const most = rng.bool();
  const answer = [...opts].sort((a, b) => (most ? PLANE[b] - PLANE[a] : PLANE[a] - PLANE[b]))[0];
  return stringMC(ctx, {
    skill: `geo.compare.${most ? 'most' : 'fewest'}_sides`,
    prompt: `أي الأشكال الآتية له ${most ? 'أكبر' : 'أقل'} عدد من الأضلاع؟`,
    answer,
    wrong: opts.filter((s) => s !== answer),
    count: 3,
    data: { shapes: opts.map((s) => ({ shape: s, sides: PLANE[s] })), answer_value: answer },
  });
}

// Pattern-block compositions (standard pattern-block relationships).
const COMPOSE = [
  { part: { one: 'مثلث', many: 'مثلثًا' }, whole: 'شكل سداسي', count: 6 },
  { part: { one: 'شبه منحرف', many: 'شبه منحرف' }, whole: 'شكل سداسي', count: 2 },
  { part: { one: 'مثلث', many: 'مثلثًا' }, whole: 'شبه منحرف', count: 3 },
  { part: { one: 'مربع صغير', many: 'مربعًا صغيرًا' }, whole: 'مستطيل من صفين وعمودين', count: 4 },
  { part: { one: 'مربع', many: 'مربعًا' }, whole: 'مستطيل طوله ضعف عرضه', count: 2 },
  { part: { one: 'مثلث', many: 'مثلثًا' }, whole: 'مربع (بقطع المربع من قطره)', count: 2 },
];
/** Composing shapes. */
function compose(ctx) {
  const { rng } = ctx;
  const c = rng.pick(COMPOSE);
  return numericMC(ctx, {
    skill: 'geo.compose',
    type: 'visual',
    prompt: `كم ${c.part.many} نحتاج لتكوين ${c.whole}؟`,
    answer: c.count,
    mistakes: [c.count + 1, c.count - 1, c.count * 2, 3],
    choiceOpts: { min: 1 },
    visual: { kind: 'compose_shapes', part: c.part.one, whole: c.whole, count: c.count },
    data: { answer_value: c.count, whole: c.whole },
  });
}

const PATTERN_SHAPES = ['مربع', 'دائرة', 'مثلث', 'مستطيل', 'نجمة'];
const UNITS = { AB: [0, 1], ABC: [0, 1, 2], AAB: [0, 0, 1], ABB: [0, 1, 1], AABB: [0, 0, 1, 1] };

/** Repeating shape patterns. params: { units:string[] } */
function shapePattern(ctx) {
  const { rng, params } = ctx;
  const unitName = rng.pick(params.units);
  const unit = UNITS[unitName];
  const shapes = rng.sample(PATTERN_SHAPES, 3);
  const seq = Array.from({ length: unit.length * 2 + 2 }, (_, i) => shapes[unit[i % unit.length]]);
  const hole = rng.bool() ? seq.length - 1 : rng.int(unit.length, seq.length - 1);
  const answer = seq[hole];
  const shown = seq.map((s, i) => (i === hole ? '؟' : s)).join('، ');
  return stringMC(ctx, {
    skill: 'geo.pattern',
    type: 'pattern',
    prompt: `ما الشكل المفقود في النمط؟ ${shown}`,
    answer,
    wrong: shapes.filter((s) => s !== answer),
    count: 3,
    visual: { kind: 'shape_sequence', shapes: seq, missing_index: hole },
    data: { sequence: seq, unit, unit_name: unitName, missing_index: hole, answer_value: answer },
  });
}

const SYMMETRY = [
  { shape: 'مربع', axes: 4 },
  { shape: 'مستطيل', axes: 2 },
  { shape: 'دائرة', axes: Infinity },
  { shape: 'مثلث متطابق الأضلاع', axes: 3 },
  { shape: 'مثلث متطابق الضلعين', axes: 1 },
  { shape: 'مثلث مختلف الأضلاع', axes: 0 },
  { shape: 'قلب', axes: 1 },
  { shape: 'متوازي أضلاع', axes: 0 },
];
/**
 * Line symmetry. params: { ask: ('has_axis'|'count_axes')[] }
 * The book asks yes/no and, when yes, how many axes (9-6).
 */
function symmetry(ctx) {
  const { rng, params } = ctx;
  if (rng.pick(params.ask ?? ['has_axis']) === 'count_axes') {
    const s = rng.pick(SYMMETRY.filter((x) => Number.isFinite(x.axes) && x.axes > 0));
    return numericMC(ctx, {
      skill: 'geo.symmetry.count_axes',
      type: 'visual',
      prompt: `كم محور تماثل ${li(s.shape)}؟`,
      answer: s.axes,
      mistakes: [s.axes + 1, s.axes - 1, s.axes * 2, 0],
      choiceOpts: { min: 0 },
      visual: { kind: 'plane_shape', shape: s.shape },
      data: { shape: s.shape, axes: s.axes, answer_value: s.axes },
    });
  }
  const s = rng.pick(SYMMETRY);
  const answer = s.axes > 0 ? 'نعم' : 'لا';
  return stringMC(ctx, {
    skill: 'geo.symmetry.has_axis',
    type: 'visual',
    prompt: `هل ${li(s.shape)} محور تماثل؟`,
    answer,
    wrong: [answer === 'نعم' ? 'لا' : 'نعم'],
    count: 2,
    visual: { kind: 'plane_shape', shape: s.shape },
    data: { shape: s.shape, axes: Number.isFinite(s.axes) ? s.axes : 'infinite', answer_value: answer },
  });
}

export default {
  'geo.solids': solids,
  'geo.plane': plane,
  'geo.compare_shapes': compareShapes,
  'geo.compose': compose,
  'geo.pattern': shapePattern,
  'geo.symmetry': symmetry,
};
