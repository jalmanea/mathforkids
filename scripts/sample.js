// Print sample exercises for eyeballing.
//   npm run sample                      one exercise per lesson, difficulty 1
//   npm run sample -- g2-s1-u5-l7 2 5   five exercises of one lesson at difficulty 2
//   npm run sample -- --json g3-s2-u11-l5 3
//   npm run sample -- sci-g2-s1-u1-l1 1 5   science lessons carry the sci- prefix
import { loadCurriculum, listLessons, difficultiesOf, generateExercise } from '../src/index.js';

const args = process.argv.slice(2);
const json = args[0] === '--json' && args.shift();
const [lessonId, diffArg, countArg] = args;
const curriculum = await loadCurriculum(lessonId?.startsWith('sci-') ? 'science' : 'math');

const show = (ex) => {
  if (json) return console.log(JSON.stringify(ex, null, 2));
  console.log(`[${ex.lesson_id} d${ex.difficulty}] ${ex.prompt}`);
  console.log(`    الإجابة: ${ex.answer}${ex.choices ? `    الخيارات: ${ex.choices.join(' | ')}` : ''}`);
};

if (lessonId) {
  const lesson = listLessons(curriculum).find((l) => l.id === lessonId);
  const d = Number(diffArg ?? difficultiesOf(lesson)[0]);
  for (let i = 0; i < Number(countArg ?? 5); i++) show(generateExercise(curriculum, lessonId, d));
} else {
  for (const l of listLessons(curriculum)) show(generateExercise(curriculum, l.id, difficultiesOf(l).at(-1)));
}
