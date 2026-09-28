// Multiplication (grade 3): meaning (equal groups), arrays, facts by table, 0 and 1, associative property.
import { n } from '../core/digits.js';
import { countNoun, NOUNS, THING_KEYS } from '../core/arabic.js';
import { numericMC, sampleUntil } from './common.js';

const mulMistakes = (a, b) => [a * (b + 1), a * (b - 1), a + b, (a + 1) * b, (a - 1) * b];

/**
 * Meaning of multiplication: equal groups / repeated addition.
 * params: { groups:[min,max], size:[min,max] }
 */
function equalGroups(ctx) {
  const { rng, params } = ctx;
  const g = rng.int(...params.groups);
  const s = rng.int(...params.size);
  const total = g * s;
  if (rng.bool()) {
    const sum = Array(g).fill(n(s)).join(' + ');
    return numericMC(ctx, {
      skill: 'mul.repeated_addition',
      type: 'fill_blank',
      prompt: `${sum} = ${n(g)} × ؟`,
      answer: s,
      mistakes: [g, total, s + 1, s - 1],
      data: { op: 'mul', factors: [g, s], form: 'repeated_addition', answer_value: s },
    });
  }
  const noun = NOUNS[rng.pick(THING_KEYS)];
  return numericMC(ctx, {
    skill: 'mul.equal_groups',
    type: 'visual',
    prompt: `${countNoun(g, NOUNS.plate)}، في كل طبق ${countNoun(s, noun)}. كم ${noun.many} في الأطباق كلها؟`,
    answer: total,
    mistakes: mulMistakes(g, s),
    visual: { kind: 'equal_groups', groups: g, size: s },
    data: { op: 'mul', factors: [g, s], answer_value: total },
  });
}

/** Arrays (rows × columns). params: { rows:[min,max], cols:[min,max] } */
function array(ctx) {
  const { rng, params } = ctx;
  const r = rng.int(...params.rows);
  const c = rng.int(...params.cols);
  return numericMC(ctx, {
    skill: 'mul.array',
    type: 'visual',
    prompt: `في الشبكة ${countNoun(r, NOUNS.row)}، وفي كل صف ${n(c)}. ${n(r)} × ${n(c)} = ؟`,
    answer: r * c,
    mistakes: [r + c, ...mulMistakes(r, c)],
    visual: { kind: 'array', rows: r, cols: c },
    data: { op: 'mul', factors: [r, c], answer_value: r * c },
  });
}

/**
 * Facts for specific tables.
 * params: { tables:number[], other:[min,max], missing_rate?:number }
 *   tables — the factor(s) this lesson teaches (e.g. [4]); the other factor ranges over `other`.
 */
function facts(ctx) {
  const { rng, params } = ctx;
  const t = rng.pick(params.tables);
  const o = rng.int(...params.other);
  const [a, b] = rng.bool() ? [t, o] : [o, t];
  const p = a * b;
  if (params.missing_rate && rng.bool(params.missing_rate) && a !== 0 && b !== 0) {
    return numericMC(ctx, {
      skill: `mul.facts.${t}.missing`,
      type: 'fill_blank',
      prompt: `${n(a)} × ؟ = ${n(p)}`,
      answer: b,
      mistakes: [b + 1, b - 1, p - a, a],
      data: { op: 'mul', factors: [a, b], table: t, form: 'missing_second', answer_value: b },
    });
  }
  return numericMC(ctx, {
    skill: `mul.facts.${t}`,
    prompt: `${n(a)} × ${n(b)} = ؟`,
    answer: p,
    mistakes: t <= 1 || o <= 1 ? [a + b, Math.max(a, b), 0, 1, p + 1] : mulMistakes(a, b),
    data: { op: 'mul', factors: [a, b], table: t, answer_value: p },
  });
}

/**
 * Associative property with known facts.
 * params: { tables:number[] } — every intermediate product uses a factor from `tables` or ≤ 10.
 */
function associative(ctx) {
  const { rng, params } = ctx;
  const [a, b, c] = sampleUntil(
    () => [rng.int(2, 5), rng.int(2, 5), rng.int(2, 5)],
    ([x, y, z]) => x * y <= 10 && y * z <= 10,
  );
  const p = a * b * c;
  if (rng.bool()) {
    return numericMC(ctx, {
      skill: 'mul.property.associative.fill',
      type: 'fill_blank',
      prompt: `(${n(a)} × ${n(b)}) × ${n(c)} = ${n(a)} × (${n(b)} × ؟)`,
      answer: c,
      mistakes: [a, b, a * b, b * c],
      data: { op: 'mul', factors: [a, b, c], property: 'associative', answer_value: c },
    });
  }
  return numericMC(ctx, {
    skill: 'mul.property.associative.compute',
    prompt: `(${n(a)} × ${n(b)}) × ${n(c)} = ؟`,
    answer: p,
    mistakes: [a * b + c, a + b * c, a + b + c, p + a],
    data: { op: 'mul', factors: [a, b, c], answer_value: p, tables: params.tables },
  });
}

export default {
  'mul.equal_groups': equalGroups,
  'mul.array': array,
  'mul.facts': facts,
  'mul.associative': associative,
};
