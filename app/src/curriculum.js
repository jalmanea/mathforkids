// The curriculum, bundled into the app (works offline), and which lessons the
// app can show. A lesson is shown only if every visual kind its generators
// produce has a renderer; that is checked by sampling each tier.

import curriculum from '../../curriculum/curriculum.json';
import { generateExercise, listLessons, difficultiesOf } from '../../src/index.js';
import { isRenderable } from './visuals/index.jsx';
import { stepsFor } from './game/adaptive.js';

export { curriculum };

const SAMPLES_PER_TIER = 25;
const supportCache = new Map();

/** True when the app can render every exercise this lesson generates. */
export function isLessonSupported(lesson) {
  if (supportCache.has(lesson.id)) return supportCache.get(lesson.id);
  let ok = true;
  outer: for (const d of difficultiesOf(lesson)) {
    for (let seed = 1; seed <= SAMPLES_PER_TIER; seed++) {
      if (!isRenderable(generateExercise(curriculum, lesson.id, d, { seed }))) {
        ok = false;
        break outer;
      }
    }
  }
  supportCache.set(lesson.id, ok);
  return ok;
}

export const allLessons = listLessons(curriculum);
export const lessonById = new Map(allLessons.map((l) => [l.id, l]));

/** Units of a grade/semester with only the supported lessons (empty units dropped). */
export function unitsFor(grade, semester) {
  const g = curriculum.grades.find((x) => x.grade === grade);
  const s = g?.semesters.find((x) => x.semester === semester);
  if (!s) return [];
  return s.units
    .map((u) => ({ ...u, lessons: u.lessons.map((l) => lessonById.get(l.id)).filter(isLessonSupported) }))
    .filter((u) => u.lessons.length);
}

/** Supported lessons of the grade/semester, in curriculum order. */
export function lessonsFor(grade, semester) {
  return unitsFor(grade, semester).flatMap((u) => u.lessons);
}

export function stepsOf(lesson) {
  return stepsFor(difficultiesOf(lesson));
}

export function unitTitle(unitId) {
  for (const g of curriculum.grades) for (const s of g.semesters) for (const u of s.units) if (u.id === unitId) return u.title;
  return unitId;
}
