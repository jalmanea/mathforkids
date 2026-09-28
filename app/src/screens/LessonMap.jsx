import { Stars, Icon, ar, count } from '../components.jsx';
import { unitsFor, lessonsFor, terms } from '../curriculum.js';
import { continueLesson, lastChosen } from './Home.jsx';

export function LessonMap({ app }) {
  const { settings, progress, go, updateSetting } = app;
  const units = unitsFor(settings.grade, settings.semester);
  const current = continueLesson(lessonsFor(settings.grade, settings.semester), progress, lastChosen(settings));

  const pickTerm = async (t) => {
    await updateSetting('grade', t.grade);
    await updateSetting('semester', t.semester);
    window.scrollTo(0, 0);
  };

  return (
    <main class="screen">
      <header class="topbar">
        <button class="icon-btn" onClick={() => go({ name: 'home' })} aria-label="رجوع">{Icon.back}</button>
        <h1>خريطة الدروس</h1>
      </header>
      <nav class="terms" aria-label="الصف والفصل">
        {terms.map((t) => (
          <button key={`${t.grade}-${t.semester}`} aria-pressed={t.grade === settings.grade && t.semester === settings.semester} onClick={() => pickTerm(t)}>
            <strong>{t.grade_label}</strong>
            {t.semester_label}
          </button>
        ))}
      </nav>
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
