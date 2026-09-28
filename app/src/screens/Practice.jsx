import { useCallback, useEffect, useRef, useState } from 'preact/hooks';
import { generateExercise, startAttempt, recordResponse, finishAttempt } from '../../../src/index.js';
import { db, progressOf } from '../db.js';
import { curriculum, lessonById, lessonsFor, stepsOf } from '../curriculum.js';
import { inputFor } from '../game/adaptive.js';
import { scoreExercise } from '../game/points.js';
import { updateProgress } from '../game/progress.js';
import { planSession } from '../game/session.js';
import { levelFor } from '../game/progress.js';
import { Visual } from '../visuals/index.jsx';
import { Keypad, Icon, ar } from '../components.jsx';
import { play } from '../sound.js';
import { speak, stopSpeaking } from '../speech.js';

export const MAX_TRIES = 3;
const PRAISE = ['أحسنت!', 'ممتاز!', 'رائع!', 'إجابة صحيحة!', 'عمل جميل!'];
const RETRY = ['حاول مرة أخرى', 'لا بأس، جرّب مرة أخرى', 'فكّر مرة أخرى'];
const pick = (a) => a[Math.floor(Math.random() * a.length)];
const uid = () => globalThis.crypto.randomUUID();

/** Earlier lessons eligible for review: the practised ones, or all earlier ones if none are practised yet. */
function reviewPoolFor(lessonId, lessons, progress) {
  const i = lessons.findIndex((l) => l.id === lessonId);
  const earlier = lessons.slice(0, Math.max(0, i)).map((l) => l.id);
  const practised = earlier.filter((id) => progress.get(id)?.attempts > 0);
  return practised.length ? practised : earlier;
}

export function Practice({ app, lessonId }) {
  const { settings, go, voice } = app;
  const length = Math.min(30, Math.max(5, settings.dailyGoal));

  // Local, synchronous copies: the app-level state updates asynchronously.
  const progRef = useRef(new Map(app.progress));
  const comboRef = useRef(0);
  const statsRef = useRef({ finished: 0, firstTry: 0, points: 0, stars: 0, levelBefore: app.totals.level.level, pointsBefore: app.totals.points });
  const sessionRef = useRef(null);

  const [index, setIndex] = useState(0);
  const [cur, setCur] = useState(null); // { ex, lesson, stepCount, input, log, review }
  const [typed, setTyped] = useState('');
  const [wrong, setWrong] = useState([]);
  const [phase, setPhase] = useState('answering'); // answering | correct | revealed
  const [feedback, setFeedback] = useState({ text: '', kind: '' });
  const [shake, setShake] = useState(0);

  const loadExercise = useCallback((i, prevPrompt) => {
    const item = sessionRef.current.plan[i];
    const lesson = lessonById.get(item.lessonId);
    const steps = stepsOf(lesson);
    const prog = progressOf(progRef.current, lesson.id);
    const step = steps[Math.min(prog.adaptive.step, steps.length - 1)];
    let ex = generateExercise(curriculum, lesson.id, step.tier);
    for (let k = 0; k < 5 && ex.prompt === prevPrompt; k++) ex = generateExercise(curriculum, lesson.id, step.tier);
    const log = startAttempt({ exercise: ex, lesson, sessionId: sessionRef.current.session_id });
    db.attempts.put(log);
    setCur({ ex, lesson, stepCount: steps.length, input: inputFor(step, ex.answer), log, review: item.review });
    setTyped('');
    setWrong([]);
    setShake(0);
    setPhase('answering');
    setFeedback({ text: '', kind: '' });
  }, []);

  useEffect(() => {
    const lessons = lessonsFor(settings.grade, settings.semester);
    const session = {
      session_id: uid(),
      learner_id: 'default',
      started_at: new Date().toISOString(),
      ended_at: null,
      lesson_id: lessonId,
      planned: length,
    };
    db.sessions.put(session);
    app.updateSetting('lastLessonId', lessonId);
    sessionRef.current = {
      ...session,
      plan: planSession({ lessonId, reviewPool: reviewPoolFor(lessonId, lessons, progRef.current), attempts: app.attempts, length }),
    };
    loadExercise(0);
    return () => stopSpeaking();
  }, []);

  const finalize = useCallback((log) => {
    const score = scoreExercise({ combo: comboRef.current }, log);
    comboRef.current = score.combo;
    const finished = { ...log, points: score.points };
    const upd = updateProgress(progressOf(progRef.current, cur.lesson.id), {
      firstTryCorrect: log.first_try_correct,
      stepCount: cur.stepCount,
    });
    progRef.current.set(cur.lesson.id, upd.progress);
    const s = statsRef.current;
    s.finished += 1;
    s.firstTry += log.first_try_correct ? 1 : 0;
    s.points += score.points;
    s.stars += upd.starsGained;
    app.commitFinished(finished, upd.progress);
    setCur((c) => ({ ...c, log: finished }));
    return { score, moved: upd.moved };
  }, [cur, app.commitFinished]);

  const answer = useCallback((value) => {
    if (phase !== 'answering' || !cur) return;
    const log = recordResponse(cur.log, value);
    const last = log.responses[log.responses.length - 1];
    if (last.correct) {
      play('correct');
      setPhase('correct');
      const { score, moved } = finalize(log);
      const bonus = score.bonus ? ` +${ar(score.bonus)} مكافأة!` : '';
      setFeedback({ text: moved === 'up' ? 'رائع! ستأتيك تمارين أصعب' : `${pick(PRAISE)}${bonus}`, kind: 'good' });
      return;
    }
    if (log.attempts >= MAX_TRIES) {
      play('wrong');
      setPhase('revealed');
      finalize(finishAttempt(log, 'gave_up'));
      setFeedback({ text: `الإجابة الصحيحة: ${cur.ex.answer}`, kind: 'reveal' });
      return;
    }
    play('wrong');
    db.attempts.put(log);
    setCur((c) => ({ ...c, log }));
    setWrong((w) => [...w, last.value]);
    setTyped('');
    setShake((k) => k + 1);
    setFeedback({ text: pick(RETRY), kind: 'gentle' });
  }, [phase, cur, finalize]);

  const endSession = useCallback(async () => {
    stopSpeaking();
    const now = new Date().toISOString();
    if (cur && cur.log.outcome === 'in_progress') await db.attempts.put(finishAttempt(cur.log, 'skipped'));
    await db.sessions.update(sessionRef.current.session_id, { ended_at: now });
    const s = statsRef.current;
    if (!s.finished) return go({ name: 'home' });
    const levelAfter = levelFor(s.pointsBefore + s.points).level;
    go({ name: 'summary', result: { ...s, levelAfter, total: length, lessonId } });
  }, [cur, go, length, lessonId]);

  const next = useCallback(() => {
    if (index + 1 >= sessionRef.current.plan.length) return endSession();
    setIndex(index + 1);
    loadExercise(index + 1, cur?.ex.prompt);
  }, [index, cur, endSession, loadExercise]);

  // A correct answer moves on by itself; a revealed answer waits for the child.
  useEffect(() => {
    if (phase !== 'correct') return;
    const t = setTimeout(next, 1300);
    return () => clearTimeout(t);
  }, [phase, next]);

  if (!cur) return <main class="screen" />;
  const { ex } = cur;
  const done = phase !== 'answering';
  const wide = ex.choices.some((c) => c.length > 7);

  return (
    <main class="screen">
      <header class="topbar">
        <button class="icon-btn" onClick={endSession} aria-label="إنهاء">{Icon.close}</button>
        <div class="progress-track" role="progressbar" aria-valuemin="0" aria-valuemax={length} aria-valuenow={index}>
          <div style={{ width: `${(index / length) * 100}%` }} />
        </div>
        <span class="pill">⭐ {ar(statsRef.current.points)}</span>
      </header>

      <section class={`card prompt-card ${shake ? 'shake' : ''}`} key={`${ex.exercise_id}-${shake}`}>
        {cur.review && <span class="review-tag">مراجعة: {cur.lesson.title}</span>}
        <div class="prompt-row">
          <p class={`prompt ${ex.prompt.length > 60 ? 'long' : ''}`} style={{ margin: 0 }}>{ex.prompt}</p>
          {voice && settings.readAloud && (
            <button class="icon-btn" onClick={() => speak(ex.prompt)} aria-label="اقرأ السؤال">{Icon.speaker}</button>
          )}
        </div>
        <Visual visual={ex.visual} />
      </section>

      <div class={`feedback ${feedback.kind}`} role="status" aria-live="polite">{feedback.text}</div>

      {cur.input === 'keypad' ? (
        <>
          <div class={`keypad-display ${phase === 'correct' ? 'right' : ''}`} aria-label="إجابتك">
            {phase === 'revealed' ? ex.answer : typed}
            {!done && <span class="caret" />}
          </div>
          <Keypad value={typed} onChange={setTyped} onSubmit={answer} disabled={done} />
        </>
      ) : (
        <div class={`choices ${wide ? 'wide' : ''}`}>
          {ex.choices.map((c) => {
            const isWrong = wrong.includes(c);
            const isRight = done && c === ex.answer;
            return (
              <button
                key={c}
                class={`choice ${isWrong ? 'wrong' : ''} ${isRight ? 'right pop' : ''}`}
                disabled={isWrong || done}
                onClick={() => answer(c)}
              >
                {c}
              </button>
            );
          })}
        </div>
      )}

      {done && (
        <button class="btn" onClick={next}>{index + 1 >= length ? 'إنهاء' : 'التالي'}</button>
      )}
    </main>
  );
}
