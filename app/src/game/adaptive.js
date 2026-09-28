// Adaptive tier per lesson (pure).
//
// A lesson's difficulty tiers become a ladder of "steps". Every tier below the
// top is answered by multiple choice; the top tier is answered on the keypad.
// A lesson with a single tier gets two steps (choice, then keypad) so the child
// still starts with choices.
//
//   up:   5 first-try correct answers in a row on the current step
//   down: 3 misses (not first-try correct) among the last 5 on the current step
// Moving resets the window, so each step is judged on its own answers.

export const UP_STREAK = 5;
export const DOWN_WINDOW = 5;
export const DOWN_MISSES = 3;

/**
 * @param {number[]} tiers  sorted difficulty tiers of the lesson, e.g. [1, 2, 3]
 * @returns {{tier:number, input:'choice'|'keypad'}[]}
 */
export function stepsFor(tiers) {
  if (!tiers.length) throw new Error('lesson has no tiers');
  if (tiers.length === 1) return [{ tier: tiers[0], input: 'choice' }, { tier: tiers[0], input: 'keypad' }];
  const top = tiers[tiers.length - 1];
  return tiers.map((tier) => ({ tier, input: tier === top ? 'keypad' : 'choice' }));
}

/** Fresh adaptive state for a lesson the child has not practised. */
export function initialAdaptive() {
  return { step: 0, run: 0, recent: [] };
}

/**
 * Apply one finished exercise.
 * @param {{step:number, run:number, recent:boolean[]}} state
 * @param {boolean} firstTryCorrect
 * @param {number} stepCount  number of steps (stepsFor(...).length)
 * @returns {{state:{step:number, run:number, recent:boolean[]}, moved:'up'|'down'|null}}
 */
export function applyResult(state, firstTryCorrect, stepCount) {
  const run = firstTryCorrect ? state.run + 1 : 0;
  const recent = [...state.recent, firstTryCorrect].slice(-DOWN_WINDOW);
  const misses = recent.filter((ok) => !ok).length;

  if (run >= UP_STREAK && state.step < stepCount - 1) {
    return { state: { step: state.step + 1, run: 0, recent: [] }, moved: 'up' };
  }
  if (misses >= DOWN_MISSES && state.step > 0) {
    return { state: { step: state.step - 1, run: 0, recent: [] }, moved: 'down' };
  }
  return { state: { step: state.step, run, recent }, moved: null };
}

/** Western or Arabic-Indic digits only: an answer the keypad can type. */
export function isKeypadAnswer(answer) {
  return /^[0-9٠-٩]+$/.test(answer);
}

/** Input mode actually used for an exercise: keypad only when the step asks for it and the answer is a plain number. */
export function inputFor(step, answer) {
  return step.input === 'keypad' && isKeypadAnswer(answer) ? 'keypad' : 'choice';
}
