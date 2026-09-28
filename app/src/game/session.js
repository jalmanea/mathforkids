// Session composer (pure).
//
// About 80% of a session practises the chosen lesson; about 20% reviews
// lessons that come earlier in the curriculum. Review lessons are drawn with
// weight = how weak the child is on their skills: 1 − (first-try accuracy,
// Laplace-smoothed), averaged over the lesson's skills. A lesson with no
// history gets the neutral weight 0.5. Review slots are spread through the
// session, never first, so each session opens on the chosen lesson.

export const REVIEW_SHARE = 0.2;

/**
 * First-try accuracy per skill, and which skills each lesson has shown.
 * @param {{lesson_id:string, skill:string, first_try_correct:boolean, outcome:string}[]} attempts
 */
export function skillStats(attempts) {
  const bySkill = new Map();
  const lessonSkills = new Map();
  for (const a of attempts) {
    if (a.outcome === 'in_progress' || a.outcome === 'skipped') continue;
    const s = bySkill.get(a.skill) ?? { n: 0, ok: 0 };
    s.n += 1;
    s.ok += a.first_try_correct ? 1 : 0;
    bySkill.set(a.skill, s);
    if (!lessonSkills.has(a.lesson_id)) lessonSkills.set(a.lesson_id, new Set());
    lessonSkills.get(a.lesson_id).add(a.skill);
  }
  return { bySkill, lessonSkills };
}

/** Smoothed first-try accuracy: (ok + 1) / (n + 2). */
export function smoothedAccuracy({ n, ok }) {
  return (ok + 1) / (n + 2);
}

/** Review weight of a lesson (higher = weaker = more likely to be reviewed). */
export function reviewWeight(lessonId, stats) {
  const skills = stats.lessonSkills.get(lessonId);
  if (!skills?.size) return 0.5;
  let sum = 0;
  for (const s of skills) sum += 1 - smoothedAccuracy(stats.bySkill.get(s));
  return sum / skills.size;
}

/**
 * Plan the lessons of one session.
 * @param {Object} args
 * @param {string} args.lessonId          the chosen lesson
 * @param {string[]} args.reviewPool      earlier lessons eligible for review (curriculum order)
 * @param {Array} args.attempts           past attempt logs (for skill accuracy)
 * @param {number} args.length            exercises in the session
 * @param {() => number} [args.random]    uniform [0,1) source
 * @returns {{lessonId:string, review:boolean}[]}
 */
export function planSession({ lessonId, reviewPool, attempts, length, random = Math.random }) {
  const reviewCount = reviewPool.length ? Math.round(length * REVIEW_SHARE) : 0;
  const stats = skillStats(attempts);
  const weights = reviewPool.map((id) => reviewWeight(id, stats));

  // Spread review slots evenly over positions 1..length-1.
  const slots = new Set();
  for (let i = 0; i < reviewCount; i++) {
    slots.add(Math.min(length - 1, Math.floor(((i + 1) * length) / (reviewCount + 1))));
  }

  const plan = [];
  for (let i = 0; i < length; i++) {
    if (slots.has(i) && i > 0) plan.push({ lessonId: pickWeighted(reviewPool, weights, random), review: true });
    else plan.push({ lessonId, review: false });
  }
  return plan;
}

export function pickWeighted(items, weights, random = Math.random) {
  const total = weights.reduce((a, b) => a + b, 0);
  let r = random() * total;
  for (let i = 0; i < items.length; i++) {
    r -= weights[i];
    if (r < 0) return items[i];
  }
  return items[items.length - 1];
}
