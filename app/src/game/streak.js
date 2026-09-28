// Daily goal and streak (pure).
//
// A day meets the goal when the child finished at least `goal` exercises that
// local day. The streak is the number of goal days in an unbroken run ending
// today (or yesterday: today still counts as "in progress" until midnight).
// One missed day is forgiven per 7 days: walking back in time, a missed day is
// skipped if no other missed day was skipped in the 6 days after it. A second
// miss inside that window ends the streak.

import { dayKey, dayStart, addDays } from './days.js';

export const DEFAULT_DAILY_GOAL = 20;
export const FREEZE_INTERVAL_DAYS = 7;

/** Is an attempt finished (counts toward the daily goal)? */
export function isFinished(attempt) {
  return attempt.outcome === 'correct' || attempt.outcome === 'gave_up';
}

/** Map of day key -> finished exercises, bucketed by `finished_at` in local time. */
export function countByDay(attempts) {
  const counts = new Map();
  for (const a of attempts) {
    if (!isFinished(a) || !a.finished_at) continue;
    const k = dayKey(a.finished_at);
    counts.set(k, (counts.get(k) ?? 0) + 1);
  }
  return counts;
}

/**
 * @param {Map<string, number>} counts  from countByDay
 * @param {number} goal
 * @param {Date} [now]
 * @returns {{streak:number, todayCount:number, todayMet:boolean, frozeDays:string[]}}
 */
export function computeStreak(counts, goal, now = new Date()) {
  const today = dayKey(now);
  const met = (k) => (counts.get(k) ?? 0) >= goal;
  const todayCount = counts.get(today) ?? 0;

  let streak = 0;
  const frozeDays = [];
  let lastFreeze = null; // day key of the most recent (later-in-time) forgiven miss
  let pendingFreeze = null; // a miss we tentatively forgave, confirmed only if an earlier goal day exists

  if (met(today)) streak = 1;
  let k = addDays(today, -1);
  // Walk back day by day. The loop ends at the first miss that cannot be forgiven.
  for (let guard = 0; guard < 3660; guard++) {
    if (met(k)) {
      streak += 1;
      if (pendingFreeze) {
        frozeDays.push(pendingFreeze);
        pendingFreeze = null;
      }
    } else {
      const canFreeze = lastFreeze === null || daysBetween(k, lastFreeze) >= FREEZE_INTERVAL_DAYS;
      if (!canFreeze || pendingFreeze) break;
      pendingFreeze = k;
      lastFreeze = k;
    }
    k = addDays(k, -1);
  }
  return { streak, todayCount, todayMet: met(today), frozeDays };
}

function daysBetween(earlierKey, laterKey) {
  // Rounding absorbs the 23/25-hour days around DST changes.
  return Math.round((dayStart(laterKey) - dayStart(earlierKey)) / 86400000);
}
