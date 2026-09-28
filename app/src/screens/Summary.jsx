import { ar, count } from '../components.jsx';
import { lessonById } from '../curriculum.js';

export function Summary({ app, result }) {
  const { go, totals } = app;
  const { finished, firstTry, points, stars, levelBefore, levelAfter, lessonId } = result;
  const acc = finished ? firstTry / finished : 0;
  const face = acc >= 0.9 ? '🌟' : acc >= 0.7 ? '😊' : '💪';
  const title = acc >= 0.9 ? 'عمل رائع!' : acc >= 0.7 ? 'أحسنت!' : 'استمر في التدريب!';

  return (
    <main class="screen">
      <section class="card summary-hero">
        <div class="big" aria-hidden="true">{face}</div>
        <h1>{title}</h1>
        <p class="muted" style={{ margin: 0 }}>أنهيت {count(finished, 'exercise')}</p>
      </section>

      <section class="summary-grid">
        <div class="card">
          <div class="value">{ar(firstTry)}</div>
          <div class="muted">صحيحة من المحاولة الأولى</div>
        </div>
        <div class="card">
          <div class="value">⭐ {ar(points)}</div>
          <div class="muted">نقاط هذه الجولة</div>
        </div>
        <div class="card">
          <div class="value">🔥 {ar(totals.streak)}</div>
          <div class="muted">أيام متتالية</div>
        </div>
        <div class="card">
          <div class="value">🏅 {ar(levelAfter)}</div>
          <div class="muted">{levelAfter > levelBefore ? 'مستوى جديد!' : 'المستوى'}</div>
        </div>
      </section>

      {stars > 0 && <p class="card center-text" style={{ margin: 0 }}>حصلت على {ar(stars)} ★ جديدة</p>}
      <p class="center-text muted" style={{ margin: 0 }}>
        {totals.todayMet ? 'حققت هدف اليوم!' : `باقي ${count(totals.goal - totals.todayCount, 'exercise')} لهدف اليوم`}
      </p>

      <button class="btn" onClick={() => go({ name: 'play', lessonId, key: Date.now() })}>جولة أخرى</button>
      <p class="center-text muted" style={{ margin: '-8px 0 0', fontSize: '15px' }}>{lessonById.get(lessonId)?.title}</p>
      <button class="btn secondary" onClick={() => go({ name: 'home' })}>الصفحة الرئيسية</button>
    </main>
  );
}
