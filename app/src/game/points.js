// Points (pure).
//
//   first try correct   10
//   second try correct   5
//   later try correct    2
//   not solved           0
//   every 5 first-try correct answers in a row: +10 bonus

export const POINTS_BY_TRY = [10, 5, 2];
export const COMBO_LENGTH = 5;
export const COMBO_BONUS = 10;

/** Points for one exercise from how many answers it took (0 = never solved). */
export function basePoints(correct, attempts) {
  if (!correct || attempts < 1) return 0;
  return POINTS_BY_TRY[Math.min(attempts, POINTS_BY_TRY.length) - 1];
}

/**
 * Score one finished exercise against the running combo.
 * @param {{combo:number}} state  first-try correct answers in a row so far
 * @param {{correct:boolean, attempts:number, first_try_correct:boolean}} result
 * @returns {{points:number, base:number, bonus:number, combo:number}}
 */
export function scoreExercise(state, result) {
  const base = basePoints(result.correct, result.attempts);
  const combo = result.first_try_correct ? state.combo + 1 : 0;
  const bonus = combo > 0 && combo % COMBO_LENGTH === 0 ? COMBO_BONUS : 0;
  return { points: base + bonus, base, bonus, combo };
}
