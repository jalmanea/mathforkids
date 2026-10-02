// Interactive answers (pure). An exercise the engine wrote as "look and
// choose" is turned around so the child builds the answer:
//
//   order      put numbers or fractions in order
//   set_clock  move the clock hands to a given time
//   pay        tap notes and coins that add up to an amount
//   symmetry   tap every line of symmetry of a shape
//   shade      colour parts of a shape to show a fraction
//
// The engine's exercise is not regenerated: only the prompt (and whether the
// picture is shown) changes, and what the child builds is turned back into a
// value in the same format as `exercise.answer`, so it is logged and checked
// by recordResponse like any other response.

import { toArabicDigits as ar } from '../../../src/core/digits.js';
import { countNoun, NOUNS } from '../../../src/core/arabic.js';
import { timeWords, clockText } from '../../../src/generators/measurement.js';

const SEP = '، ';
const frac = (num, den) => `⁦${ar(num)}/${ar(den)}⁩`;

/** Small deterministic PRNG, so a tray or a mix decision is stable for an exercise. */
export function seeded(seed) {
  let s = seed >>> 0 || 1;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
}

// ---------- symmetry: candidate lines in the 120×120 shape box ----------

const V = { id: 'v', x1: 60, y1: 2, x2: 60, y2: 118 };
const H = { id: 'h', x1: 2, y1: 60, x2: 118, y2: 60 };
const D1 = { id: 'd1', x1: 8, y1: 8, x2: 112, y2: 112 };
const D2 = { id: 'd2', x1: 112, y1: 8, x2: 8, y2: 112 };
const axis = (l) => ({ ...l, axis: true });
const decoy = (l) => ({ ...l, axis: false });

/** Lines offered for each shape; `axis` marks the true lines of symmetry. */
export const SYMMETRY_LINES = {
  مربع: [axis(V), axis(H), axis(D1), axis(D2)],
  مستطيل: [axis(V), axis(H), decoy({ id: 'd1', x1: 6, y1: 32, x2: 114, y2: 88 }), decoy({ id: 'd2', x1: 114, y1: 32, x2: 6, y2: 88 })],
  'مثلث متطابق الأضلاع': [
    axis({ id: 'v', x1: 60, y1: 6, x2: 60, y2: 104 }),
    axis({ id: 'r', x1: 112, y1: 100, x2: 26, y2: 48.5 }),
    axis({ id: 'l', x1: 8, y1: 100, x2: 94, y2: 48.5 }),
    decoy({ id: 'h', x1: 6, y1: 68, x2: 114, y2: 68 }),
  ],
  'مثلث متطابق الضلعين': [
    axis({ id: 'v', x1: 60, y1: 0, x2: 60, y2: 116 }),
    decoy({ id: 'h', x1: 14, y1: 72, x2: 106, y2: 72 }),
    decoy({ id: 'r', x1: 104, y1: 115, x2: 32, y2: 49 }),
    decoy({ id: 'l', x1: 16, y1: 115, x2: 88, y2: 49 }),
  ],
  قلب: [axis({ id: 'v', x1: 60, y1: 10, x2: 60, y2: 112 }), decoy({ id: 'h', x1: 6, y1: 56, x2: 114, y2: 56 }), decoy(D1), decoy(D2)],
};

// ---------- which exercises become interactive ----------

/**
 * @param {Object} ex  an engine exercise
 * @returns {null | {kind:string, prompt:string, hideVisual?:boolean, [k:string]:any}}
 */
export function interactionFor(ex) {
  const rnd = seeded(ex.seed ?? 1);
  const roll = rnd();

  if (ex.type === 'ordering') {
    const solution = ex.answer.split(SEP);
    // Start from the order given in the prompt (never already solved).
    const items = ex.data.fractions ? ex.data.fractions.map((f) => frac(f.num, f.den)) : ex.data.numbers.map((v) => ar(v));
    if (items.join(SEP) === ex.answer) items.reverse();
    return { kind: 'order', prompt: `${ex.prompt.split(':')[0]}. اسحب لتغيير الترتيب.`, items, solution };
  }

  if (ex.visual?.kind === 'clock' && /^time\.read\.\d+$/.test(ex.skill) && roll < 0.7) {
    const step = Number(ex.skill.split('.')[2]);
    const words = ex.answer.startsWith('الساعة');
    return {
      kind: 'set_clock',
      prompt: `حرّك عقربَي الساعة لتُظهر الوقت: ${ex.answer}`,
      hideVisual: true,
      step,
      words,
      target: { hour: ex.data.hour, minute: ex.data.minute },
    };
  }

  if (ex.skill === 'money.count' && roll < 0.5) {
    const total = ex.data.answer_value;
    return {
      kind: 'pay',
      prompt: `اختر نقودًا مجموعها ${countNoun(total, NOUNS.riyal)}.`,
      hideVisual: true,
      total,
      tray: payTray(ex.data.items, rnd),
      solution: ex.data.items,
    };
  }

  if (ex.skill === 'geo.symmetry.count_axes' && SYMMETRY_LINES[ex.data.shape] && roll < 0.7) {
    return { kind: 'symmetry', prompt: 'المس كل محاور التماثل في الشكل.', hideVisual: true, shape: ex.data.shape, lines: SYMMETRY_LINES[ex.data.shape] };
  }

  if ((ex.skill === 'frac.whole.unit' || ex.skill === 'frac.whole.any') && ex.visual?.kind === 'fraction_model' && roll < 0.7) {
    return { kind: 'shade', prompt: `لوّن ${ex.answer} من الشكل.`, hideVisual: true, model: ex.visual.model, parts: ex.visual.parts, target: ex.visual.shaded };
  }
  return null;
}

/** The exercise as it is shown and logged once an interaction applies. */
export function applyInteraction(ex, it) {
  return { ...ex, prompt: it.prompt, visual: it.hideVisual ? null : ex.visual, data: { ...ex.data, interaction: it.kind } };
}

/**
 * Notes and coins to choose from, shuffled: the exercise's own items (so the
 * amount can always be made) plus three extras of denominations it already uses.
 */
export function payTray(items, rnd = Math.random) {
  const kinds = [...new Set(items)];
  const extras = Array.from({ length: 3 }, () => kinds[Math.floor(rnd() * kinds.length)]);
  const tray = [...items, ...extras];
  for (let i = tray.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [tray[i], tray[j]] = [tray[j], tray[i]];
  }
  return tray;
}

// ---------- what the child built → a response value ----------

const angleGap = (a, b) => Math.min(Math.abs(a - b), 360 - Math.abs(a - b));

/**
 * Which hand a touch grabs. `reach` is the touch's distance from the centre
 * as a fraction of the clock radius (the short hand ends near 0.5).
 * Hands that point almost the same way (e.g. both at 12 to begin with) cannot
 * be told apart by angle, so there the touch near the centre takes the short
 * hand and the touch near the rim takes the long one.
 */
export function pickHand(time, angleDeg, reach, step) {
  if (step === 60) return 'hour'; // hour-only lessons: the long hand stays at 12
  const hourAngle = ((time.hour % 12) + time.minute / 60) * 30;
  const minuteAngle = time.minute * 6;
  if (angleGap(hourAngle, minuteAngle) < 25) return reach < 0.55 ? 'hour' : 'minute';
  return angleGap(angleDeg, hourAngle) < angleGap(angleDeg, minuteAngle) ? 'hour' : 'minute';
}

/** Snap a pointer angle (degrees clockwise from 12) to the hand being moved. */
export function moveHand(time, hand, angleDeg, step) {
  const a = ((angleDeg % 360) + 360) % 360;
  if (hand === 'minute') {
    const stepMin = step === 60 ? 60 : step;
    return { ...time, minute: (Math.round(a / 6 / stepMin) * stepMin) % 60 };
  }
  // The hour hand sits between numbers by the minutes already shown.
  const h = Math.round((a - time.minute * 0.5) / 30);
  return { ...time, hour: ((h + 11) % 12 + 12) % 12 + 1 };
}

/** A clock time in the same format as the exercise's answer (words or ٣:١٥). */
export function clockValue({ hour, minute }, words) {
  return words && minute % 15 === 0 ? timeWords(hour, minute) : clockText(hour, minute);
}

/**
 * Response value for what the child built. It equals `answer` exactly when
 * the construction is right, and is a readable wrong value otherwise.
 * @param {Object} it      from interactionFor
 * @param {*} state        order: string[] · set_clock: {hour,minute} · pay: number[] (chosen values)
 *                         symmetry: string[] (chosen line ids) · shade: number (parts coloured)
 * @param {string} answer  exercise.answer
 */
export function interactionValue(it, state, answer) {
  switch (it.kind) {
    case 'order':
      return state.join(SEP);
    case 'set_clock':
      return clockValue(state, it.words);
    case 'pay':
      return ar(state.reduce((a, b) => a + b, 0));
    case 'symmetry': {
      const want = it.lines.filter((l) => l.axis).map((l) => l.id).sort();
      const got = [...state].sort();
      if (got.length === want.length && got.every((id, i) => id === want[i])) return answer;
      // Right count but wrong lines must not read as the right answer.
      return got.length === want.length ? `${ar(got.length)} (خطوط أخرى)` : ar(got.length);
    }
    case 'shade':
      return frac(state, it.parts);
    default:
      throw new Error(`unknown interaction ${it.kind}`);
  }
}

/** The state that solves the exercise (shown after three misses). */
export function solutionState(it) {
  switch (it.kind) {
    case 'order': return it.solution;
    case 'set_clock': return it.target;
    case 'pay': return it.solution;
    case 'symmetry': return it.lines.filter((l) => l.axis).map((l) => l.id);
    case 'shade': return it.target;
    default: return null;
  }
}
