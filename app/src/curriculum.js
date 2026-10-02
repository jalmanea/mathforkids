// The curricula, bundled into the app (works offline), and which lessons the
// app can show. A lesson is shown only if every visual kind its generators
// produce has a renderer; that is checked by sampling each tier.
//
// There is one curriculum file per subject. Lesson ids are unique across
// subjects, so progress, logs and sessions need no subject column.

import math from '../../curriculum/curriculum.json';
import science from '../../curriculum/science.json';
import { generateExercise, listLessons, difficultiesOf } from '../../src/index.js';
import { isRenderable } from './visuals/index.jsx';
import { stepsFor } from './game/adaptive.js';

/** Subjects in the order they are offered. `app` is the name shown on the home screen. */
export const SUBJECTS = [
  { key: 'math', label: 'الرياضيات', app: 'رياضياتي', emoji: '🔢', curriculum: math },
  { key: 'science', label: 'العلوم', app: 'علومي', emoji: '🔬', curriculum: science },
];
export const subjectOf = (key) => SUBJECTS.find((s) => s.key === key) ?? SUBJECTS[0];

export const allLessons = SUBJECTS.flatMap((s) => listLessons(s.curriculum).map((l) => ({ ...l, subject: s.key })));
export const lessonById = new Map(allLessons.map((l) => [l.id, l]));

/** Generate an exercise for any lesson of any subject. */
export function generate(lessonId, tier, opts) {
  return generateExercise(subjectOf(lessonById.get(lessonId).subject).curriculum, lessonId, tier, opts);
}

const SAMPLES_PER_TIER = 25;
const supportCache = new Map();

/** True when the app can render every exercise this lesson generates. */
export function isLessonSupported(lesson) {
  if (supportCache.has(lesson.id)) return supportCache.get(lesson.id);
  let ok = true;
  outer: for (const d of difficultiesOf(lesson)) {
    for (let seed = 1; seed <= SAMPLES_PER_TIER; seed++) {
      if (!isRenderable(generate(lesson.id, d, { seed }))) {
        ok = false;
        break outer;
      }
    }
  }
  supportCache.set(lesson.id, ok);
  return ok;
}

/** Units of a subject's grade/semester with only the supported lessons (empty units dropped). */
export function unitsFor(subject, grade, semester) {
  const g = subjectOf(subject).curriculum.grades.find((x) => x.grade === grade);
  const s = g?.semesters.find((x) => x.semester === semester);
  if (!s) return [];
  return s.units
    .map((u) => ({ ...u, lessons: u.lessons.map((l) => lessonById.get(l.id)).filter(isLessonSupported) }))
    .filter((u) => u.lessons.length);
}

/** Supported lessons of the subject's grade/semester, in curriculum order. */
export function lessonsFor(subject, grade, semester) {
  return unitsFor(subject, grade, semester).flatMap((u) => u.lessons);
}

/** Key of settings.lastLessons. Math keeps its original "grade-semester" keys. */
export function termKey(subject, grade, semester) {
  return subject === 'math' ? `${grade}-${semester}` : `${subject}:${grade}-${semester}`;
}

const ORDINAL = { 1: 'الأول', 2: 'الثاني', 3: 'الثالث' };

/** Every grade/semester (the same for all subjects), e.g. { grade: 2, semester: 1, grade_label: 'الصف الثاني', semester_label: 'الفصل الأول' }. */
export const terms = math.grades.flatMap((g) =>
  g.semesters.map((s) => ({ grade: g.grade, semester: s.semester, grade_label: `الصف ${ORDINAL[g.grade]}`, semester_label: `الفصل ${ORDINAL[s.semester]}` })),
);

export function termLabel(grade, semester) {
  return `الصف ${ORDINAL[grade]}، الفصل ${ORDINAL[semester]}`;
}

export function stepsOf(lesson) {
  return stepsFor(difficultiesOf(lesson));
}

export function unitTitle(unitId) {
  for (const { curriculum } of SUBJECTS) for (const g of curriculum.grades) for (const s of g.semesters) for (const u of s.units) if (u.id === unitId) return u.title;
  return unitId;
}
