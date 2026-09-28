import { GoalRing, Icon, ar, count } from '../components.jsx';
import { lessonsFor, termLabel } from '../curriculum.js';

const unstarred = (progress) => (l) => (progress.get(l.id)?.stars ?? 0) < 3;

/** The lesson last chosen in this grade/semester (reviews don't count). */
export function lastChosen(settings) {
  return settings.lastLessons?.[`${settings.grade}-${settings.semester}`];
}

/** Lesson to continue: the last one chosen in this term, or the next one once it has 3 stars. */
export function continueLesson(lessons, progress, lastLessonId) {
  if (!lessons.length) return null;
  const last = lessons.find((l) => l.id === lastLessonId);
  if (!last) return lessons.find(unstarred(progress)) ?? lessons[0];
  if ((progress.get(last.id)?.stars ?? 0) < 3) return last;
  const i = lessons.indexOf(last);
  return lessons.slice(i + 1).find(unstarred(progress)) ?? last;
}

export function Home({ app }) {
  const { totals, settings, progress, go } = app;
  const lessons = lessonsFor(settings.grade, settings.semester);
  const next = continueLesson(lessons, progress, lastChosen(settings));
  const { level, fraction } = totals.level;

  return (
    <main class="screen">
      <header class="topbar">
        <h1>رياضياتي</h1>
        <span class="pill" aria-label="النقاط">⭐ {ar(totals.points)}</span>
        <button class="icon-btn" onClick={() => go({ name: 'parent' })} aria-label="ركن الوالدين">{Icon.lock}</button>
      </header>

      <section class="card home-hero">
        <h2>هدف اليوم</h2>
        <GoalRing done={totals.todayCount} goal={totals.goal} />
        <p class="muted" style={{ margin: 0 }}>
          {totals.todayMet ? 'أحسنت! حققت هدف اليوم' : `باقي ${count(totals.goal - totals.todayCount, 'exercise')}`}
        </p>
      </section>

      <section class="stats-row">
        <div class="card stat">
          <span class="emoji" aria-hidden="true">🔥</span>
          <div>
            <div class="value">{ar(totals.streak)}</div>
            <div class="label">أيام متتالية</div>
          </div>
        </div>
        <div class="card">
          <div class="stat">
            <span class="emoji" aria-hidden="true">🏅</span>
            <div>
              <div class="value">{ar(level)}</div>
              <div class="label">المستوى</div>
            </div>
          </div>
          <div class="level-bar" aria-hidden="true"><div style={{ width: `${Math.round(fraction * 100)}%` }} /></div>
        </div>
      </section>

      {next && (
        <button class="btn" onClick={() => go({ name: 'play', lessonId: next.id, key: Date.now() })}>
          <span>ابدأ التمرين</span>
        </button>
      )}
      {next && <p class="muted center-text" style={{ margin: '-8px 0 0', fontSize: '15px' }}>{next.title}<br />{termLabel(settings.grade, settings.semester)}</p>}
      <button class="btn secondary" onClick={() => go({ name: 'map' })}>
        {Icon.map}<span>خريطة الدروس</span>
      </button>
    </main>
  );
}
