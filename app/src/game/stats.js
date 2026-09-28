// Aggregations for the parent view (pure). Everything is a single pass over
// the denormalized attempt logs; no joins beyond a lesson lookup for titles.

import { dayKey, lastDays } from './days.js';
import { isFinished } from './streak.js';

/** Exercises finished and minutes spent per local day, oldest first. */
export function dailyActivity(attempts, days = 14, now = new Date()) {
  const keys = lastDays(dayKey(now), days);
  const rows = new Map(keys.map((day) => [day, { day, exercises: 0, minutes: 0 }]));
  for (const a of attempts) {
    if (!isFinished(a) || !a.finished_at) continue;
    const row = rows.get(dayKey(a.finished_at));
    if (!row) continue;
    row.exercises += 1;
    row.minutes += (a.time_spent_ms ?? 0) / 60000;
  }
  return keys.map((k) => rows.get(k));
}

function tally(map, key, a) {
  const t = map.get(key) ?? { n: 0, ok: 0 };
  t.n += 1;
  t.ok += a.first_try_correct ? 1 : 0;
  map.set(key, t);
}

/**
 * First-try accuracy by unit, and by lesson within each unit, in curriculum order.
 * @param {Array} attempts
 * @param {{id:string, unit_id:string}[]} lessons  curriculum-ordered lesson list
 */
export function accuracyByUnit(attempts, lessons) {
  const byLesson = new Map();
  for (const a of attempts) if (isFinished(a)) tally(byLesson, a.lesson_id, a);

  const units = [];
  const unitIndex = new Map();
  for (const l of lessons) {
    const t = byLesson.get(l.id);
    if (!t) continue;
    if (!unitIndex.has(l.unit_id)) {
      unitIndex.set(l.unit_id, units.length);
      units.push({ unit_id: l.unit_id, n: 0, ok: 0, lessons: [] });
    }
    const u = units[unitIndex.get(l.unit_id)];
    u.n += t.n;
    u.ok += t.ok;
    u.lessons.push({ lesson_id: l.id, n: t.n, ok: t.ok, acc: t.ok / t.n });
  }
  return units.map((u) => ({ ...u, acc: u.ok / u.n }));
}

/**
 * Skills with low first-try accuracy, weakest first.
 * @returns {{skill:string, lesson_id:string, n:number, ok:number, acc:number}[]}
 */
export function needsPractice(attempts, { minAnswers = 5, threshold = 0.7 } = {}) {
  const bySkill = new Map();
  const lessonOf = new Map();
  for (const a of attempts) {
    if (!isFinished(a)) continue;
    tally(bySkill, a.skill, a);
    lessonOf.set(a.skill, a.lesson_id); // most recent lesson that showed this skill
  }
  return [...bySkill]
    .map(([skill, t]) => ({ skill, lesson_id: lessonOf.get(skill), n: t.n, ok: t.ok, acc: t.ok / t.n }))
    .filter((s) => s.n >= minAnswers && s.acc < threshold)
    .sort((a, b) => a.acc - b.acc || b.n - a.n);
}

/** One row per session, newest first. */
export function sessionRows(sessions, attempts) {
  const bySession = new Map();
  for (const a of attempts) {
    if (!isFinished(a)) continue;
    const r = bySession.get(a.session_id) ?? { n: 0, ok: 0, ms: 0, points: 0 };
    r.n += 1;
    r.ok += a.first_try_correct ? 1 : 0;
    r.ms += a.time_spent_ms ?? 0;
    r.points += a.points ?? 0;
    bySession.set(a.session_id, r);
  }
  return sessions
    .map((s) => {
      const r = bySession.get(s.session_id) ?? { n: 0, ok: 0, ms: 0, points: 0 };
      return { ...s, exercises: r.n, first_try: r.ok, acc: r.n ? r.ok / r.n : null, minutes: r.ms / 60000, points: r.points };
    })
    .filter((s) => s.exercises > 0)
    .sort((a, b) => (a.started_at < b.started_at ? 1 : -1));
}
