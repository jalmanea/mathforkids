// Per-lesson progress, stars and player level (pure).
//
// Stars come from first-try accuracy on the lesson's top step (the keypad
// step), over the last STAR_WINDOW answers there, once at least STAR_MIN_ANSWERS
// have been given. Stars never go down: the best rating is kept.
//
// Level L needs 50·L·(L−1) total points: 0, 100, 300, 600, 1000, …

import { initialAdaptive, applyResult } from './adaptive.js';

export const STAR_WINDOW = 10;
export const STAR_MIN_ANSWERS = 5;

/** Stars (0–3) for a list of first-try results on the top step. */
export function starsFor(topRecent) {
  if (topRecent.length < STAR_MIN_ANSWERS) return 0;
  const acc = topRecent.filter(Boolean).length / topRecent.length;
  if (acc >= 0.9) return 3;
  if (acc >= 0.7) return 2;
  return 1;
}

/** Progress row for a lesson the child has not practised. */
export function initialProgress(lessonId, learnerId = 'default') {
  return {
    learner_id: learnerId,
    lesson_id: lessonId,
    adaptive: initialAdaptive(),
    attempts: 0,
    first_try: 0,
    top_recent: [],
    stars: 0,
    last_played_at: null,
  };
}

/**
 * Apply one finished exercise to a lesson's progress.
 * @param {ReturnType<typeof initialProgress>} progress
 * @param {{firstTryCorrect:boolean, stepCount:number, now?:Date}} result
 * @returns {{progress:object, moved:'up'|'down'|null, starsGained:number}}
 */
export function updateProgress(progress, { firstTryCorrect, stepCount, now = new Date() }) {
  const onTop = progress.adaptive.step === stepCount - 1;
  const top_recent = onTop ? [...progress.top_recent, firstTryCorrect].slice(-STAR_WINDOW) : progress.top_recent;
  const stars = Math.max(progress.stars, starsFor(top_recent));
  const { state, moved } = applyResult(progress.adaptive, firstTryCorrect, stepCount);
  return {
    progress: {
      ...progress,
      adaptive: state,
      attempts: progress.attempts + 1,
      first_try: progress.first_try + (firstTryCorrect ? 1 : 0),
      top_recent,
      stars,
      last_played_at: now.toISOString(),
    },
    moved,
    starsGained: stars - progress.stars,
  };
}

/** Total points needed to reach `level`. */
export function levelThreshold(level) {
  return 50 * level * (level - 1);
}

/** Player level from total points, with progress toward the next level. */
export function levelFor(points) {
  let level = 1;
  while (points >= levelThreshold(level + 1)) level++;
  const floor = levelThreshold(level);
  const next = levelThreshold(level + 1);
  return { level, floor, next, fraction: (points - floor) / (next - floor) };
}
