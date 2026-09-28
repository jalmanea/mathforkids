// Performance-log data model (pure functions, no storage).
//
// Phase 2 persists these records in IndexedDB on the device, with an
// export/import JSON backup. Nothing here depends on the storage choice.
//
// Design notes for the parent view:
//  - One AttemptLog per exercise shown. It is denormalized (grade, semester,
//    unit_id, skill are copied in) so "accuracy by unit", "time per session",
//    and "trend over days" are single-table group-bys with no joins.
//  - The full exercise is snapshotted, so history stays readable even if the
//    curriculum file or a generator changes later.
//  - learner_id is on every record. There is one learner today ("default");
//    adding a second child means adding a Learner row, not a migration.

import { toArabicDigits } from '../core/digits.js';

export const LOG_SCHEMA_VERSION = 1;
export const DEFAULT_LEARNER_ID = 'default';

/**
 * @typedef {Object} Learner
 * @property {string} learner_id
 * @property {string} display_name
 * @property {string} created_at   ISO timestamp
 */

/**
 * @typedef {Object} Session
 * @property {string} session_id
 * @property {string} learner_id
 * @property {string} started_at   ISO timestamp
 * @property {string|null} ended_at
 */

/**
 * @typedef {Object} Response
 * @property {string} value        What the child answered (as displayed).
 * @property {boolean} correct
 * @property {number} at_ms        Milliseconds since the exercise was shown.
 */

/**
 * @typedef {Object} AttemptLog
 * @property {number} log_schema_version
 * @property {string} exercise_id  Primary key (unique per generated exercise).
 * @property {string} learner_id
 * @property {string} session_id
 * @property {string} lesson_id
 * @property {string} unit_id
 * @property {number} grade
 * @property {number} semester
 * @property {number} difficulty
 * @property {string} skill
 * @property {Object} exercise     Snapshot of the Exercise object.
 * @property {string} shown_at     ISO timestamp
 * @property {string|null} finished_at
 * @property {number|null} time_spent_ms
 * @property {Response[]} responses
 * @property {number} attempts     = responses.length
 * @property {boolean} correct     Eventually answered correctly.
 * @property {boolean} first_try_correct
 * @property {'in_progress'|'correct'|'gave_up'|'skipped'} outcome
 */

/**
 * @param {Object} args
 * @param {import('../core/exercise.js').Exercise} args.exercise
 * @param {{id:string, unit_id:string, grade:number, semester:number}} args.lesson  From the curriculum map.
 * @param {string} args.sessionId
 * @param {string} [args.learnerId]
 * @param {Date} [args.now]
 * @returns {AttemptLog}
 */
export function startAttempt({ exercise, lesson, sessionId, learnerId = DEFAULT_LEARNER_ID, now = new Date() }) {
  return {
    log_schema_version: LOG_SCHEMA_VERSION,
    exercise_id: exercise.exercise_id,
    learner_id: learnerId,
    session_id: sessionId,
    lesson_id: exercise.lesson_id,
    unit_id: lesson.unit_id,
    grade: lesson.grade,
    semester: lesson.semester,
    difficulty: exercise.difficulty,
    skill: exercise.skill,
    exercise,
    shown_at: now.toISOString(),
    finished_at: null,
    time_spent_ms: null,
    responses: [],
    attempts: 0,
    correct: false,
    first_try_correct: false,
    outcome: 'in_progress',
  };
}

/** Record one answer. Returns a new log (does not mutate). */
export function recordResponse(log, rawValue, now = new Date()) {
  // A typed answer may arrive in Western digits (device keyboard); normalize.
  const value = toArabicDigits(String(rawValue).trim());
  const correct = value === log.exercise.answer;
  const responses = [...log.responses, { value, correct, at_ms: now - new Date(log.shown_at) }];
  const next = {
    ...log,
    responses,
    attempts: responses.length,
    correct: log.correct || correct,
    first_try_correct: responses[0].correct,
  };
  return correct ? finishAttempt(next, 'correct', now) : next;
}

/** Close the attempt (correct, gave up, or skipped). */
export function finishAttempt(log, outcome, now = new Date()) {
  return {
    ...log,
    outcome,
    finished_at: now.toISOString(),
    time_spent_ms: now - new Date(log.shown_at),
  };
}
