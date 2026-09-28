import { Stars, Icon, ar, count } from '../components.jsx';
import { unitsFor, lessonsFor } from '../curriculum.js';
import { continueLesson } from './Home.jsx';

export function LessonMap({ app }) {
  const { settings, progress, go } = app;
  const units = unitsFor(settings.grade, settings.semester);
  const current = continueLesson(lessonsFor(settings.grade, settings.semester), progress, settings.lastLessonId);

  return (
    <main class="screen">
      <header class="topbar">
        <button class="icon-btn" onClick={() => go({ name: 'home' })} aria-label="رجوع">{Icon.back}</button>
        <h1>خريطة الدروس</h1>
      </header>
      {!units.length && <p class="empty">لا توجد دروس متاحة لهذا الفصل بعد.</p>}
      {units.map((u) => (
        <section class="unit" key={u.id}>
          <h2 class="unit-title"><span class="unit-num">{ar(u.number)}</span>{u.title}</h2>
          {u.lessons.map((l) => {
            const p = progress.get(l.id);
            return (
              <button
                key={l.id}
                class={`lesson-btn ${current?.id === l.id ? 'current' : ''}`}
                onClick={() => go({ name: 'play', lessonId: l.id, key: Date.now() })}
              >
                <span class="t">
                  {l.title}
                  <span class="sub">{p?.attempts ? count(p.attempts, 'exercise') : 'لم يبدأ بعد'}</span>
                </span>
                <Stars count={p?.stars ?? 0} />
              </button>
            );
          })}
        </section>
      ))}
    </main>
  );
}
