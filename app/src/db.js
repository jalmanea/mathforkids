// On-device storage (IndexedDB via Dexie). Nothing leaves the phone.
//
//   learners  one row, "default"
//   sessions  one row per practice session
//   attempts  AttemptLog records (src/logging/attempt-log.js) plus `points`
//   progress  per-lesson adaptive step, counters and stars
//   settings  key/value rows: theme, sound, readAloud, pin, dailyGoal, grade, semester, lastLessons

import Dexie from 'dexie';
import { DEFAULT_LEARNER_ID } from '../../src/index.js';
import { DEFAULT_DAILY_GOAL } from './game/streak.js';
import { initialProgress } from './game/progress.js';

export const db = new Dexie('saudi-math');
db.version(1).stores({
  learners: 'learner_id',
  sessions: 'session_id, learner_id, started_at',
  attempts: 'exercise_id, learner_id, session_id, lesson_id, skill, shown_at',
  progress: '[learner_id+lesson_id], learner_id',
  settings: 'key',
});

export const TABLES = ['learners', 'sessions', 'attempts', 'progress', 'settings'];

export const DEFAULT_SETTINGS = {
  theme: 'neutral',
  sound: true,
  readAloud: true,
  pin: null,
  dailyGoal: DEFAULT_DAILY_GOAL,
  grade: 3,
  semester: 1,
  lastLessons: {}, // "grade-semester" -> lesson the child last chose there (reviews don't count)
};

/** First launch: learner row and persistent storage (so iOS does not evict the logs). */
export async function initDb() {
  if (!(await db.learners.get(DEFAULT_LEARNER_ID))) {
    await db.learners.put({ learner_id: DEFAULT_LEARNER_ID, display_name: '', created_at: new Date().toISOString() });
  }
  try {
    if (navigator.storage?.persist && !(await navigator.storage.persisted())) await navigator.storage.persist();
  } catch {
    // Not supported or denied; data still lives in IndexedDB.
  }
}

export async function loadSettings() {
  const rows = await db.settings.toArray();
  return { ...DEFAULT_SETTINGS, ...Object.fromEntries(rows.map((r) => [r.key, r.value])) };
}

export function saveSetting(key, value) {
  return db.settings.put({ key, value });
}

export async function loadProgress(learnerId = DEFAULT_LEARNER_ID) {
  const rows = await db.progress.where('learner_id').equals(learnerId).toArray();
  return new Map(rows.map((r) => [r.lesson_id, r]));
}

export function progressOf(progressMap, lessonId) {
  return progressMap.get(lessonId) ?? initialProgress(lessonId);
}

export function allAttempts(learnerId = DEFAULT_LEARNER_ID) {
  return db.attempts.where('learner_id').equals(learnerId).toArray();
}

/** Full backup of every table as plain JSON. */
export async function exportAll() {
  const tables = {};
  for (const t of TABLES) tables[t] = await db.table(t).toArray();
  return { app: 'saudi-math', format: 1, exported_at: new Date().toISOString(), tables };
}

/** Replace every table with a backup made by exportAll. */
export async function importAll(backup) {
  if (backup?.app !== 'saudi-math' || !backup.tables) throw new Error('not a backup file');
  await db.transaction('rw', TABLES.map((t) => db.table(t)), async () => {
    for (const t of TABLES) {
      await db.table(t).clear();
      if (Array.isArray(backup.tables[t])) await db.table(t).bulkPut(backup.tables[t]);
    }
  });
}

/** Delete all practice data (keeps nothing but a fresh learner row). */
export async function resetAll() {
  await db.transaction('rw', TABLES.map((t) => db.table(t)), async () => {
    for (const t of TABLES) await db.table(t).clear();
  });
  await initDb();
}
