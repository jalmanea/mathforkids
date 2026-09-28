import { render } from 'preact';
import { useCallback, useEffect, useMemo, useRef, useState } from 'preact/hooks';
import './theme.css';
import { db, initDb, loadSettings, saveSetting, loadProgress, allAttempts } from './db.js';
import { configureSound, play, unlockAudio } from './sound.js';
import { hasArabicVoice } from './speech.js';
import { countByDay, computeStreak } from './game/streak.js';
import { levelFor } from './game/progress.js';
import { Confetti, Toast, ar } from './components.jsx';
import { Home } from './screens/Home.jsx';
import { LessonMap } from './screens/LessonMap.jsx';
import { Practice } from './screens/Practice.jsx';
import { Summary } from './screens/Summary.jsx';
import { Parent } from './screens/Parent.jsx';

function App() {
  const [ready, setReady] = useState(false);
  const [settings, setSettings] = useState(null);
  const [progress, setProgress] = useState(new Map());
  const [attempts, setAttempts] = useState([]);
  const [voice, setVoice] = useState(false);
  const [screen, setScreen] = useState({ name: 'home' });
  const [burst, setBurst] = useState(0);
  const [toast, setToast] = useState(null);
  const attemptsRef = useRef(attempts);
  attemptsRef.current = attempts;

  const celebrate = useCallback((cue, message) => {
    play(cue);
    setBurst((b) => b + 1);
    setToast(message);
  }, []);

  const reload = useCallback(async () => {
    const [s, p, a] = await Promise.all([loadSettings(), loadProgress(), allAttempts()]);
    setSettings(s);
    setProgress(p);
    setAttempts(a);
  }, []);

  useEffect(() => {
    (async () => {
      await initDb();
      await reload();
      setReady(true);
      setVoice(await hasArabicVoice());
    })();
  }, []);

  useEffect(() => {
    if (!settings) return;
    document.documentElement.dataset.theme = settings.theme;
    configureSound({ enabled: settings.sound, theme: settings.theme });
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', settings.theme === 'stitch' ? '#3B6FB6' : '#2F5D9E');
  }, [settings]);

  // iOS starts Web Audio only inside a gesture.
  useEffect(() => {
    const unlock = () => unlockAudio();
    window.addEventListener('pointerdown', unlock);
    return () => window.removeEventListener('pointerdown', unlock);
  }, []);

  const totals = useMemo(() => {
    const goal = settings?.dailyGoal ?? 20;
    const counts = countByDay(attempts);
    const points = attempts.reduce((s, a) => s + (a.points ?? 0), 0);
    return { ...computeStreak(counts, goal), goal, points, level: levelFor(points) };
  }, [attempts, settings]);

  const updateSetting = useCallback(async (key, value) => {
    await saveSetting(key, value);
    setSettings((s) => ({ ...s, [key]: value }));
  }, []);

  /** Store a finished exercise and its lesson progress; celebrate goal and level-ups. */
  const commitFinished = useCallback(async (log, progressRow) => {
    await db.transaction('rw', db.attempts, db.progress, async () => {
      await db.attempts.put(log);
      await db.progress.put(progressRow);
    });
    setProgress((m) => new Map(m).set(progressRow.lesson_id, progressRow));

    const list = attemptsRef.current;
    const next = [...list.filter((a) => a.exercise_id !== log.exercise_id), log];
    attemptsRef.current = next;
    setAttempts(next);

    const goal = settings.dailyGoal;
    const metBefore = computeStreak(countByDay(list), goal).todayMet;
    const metAfter = computeStreak(countByDay(next), goal).todayMet;
    const pointsBefore = list.reduce((s, a) => s + (a.points ?? 0), 0);
    const lvBefore = levelFor(pointsBefore).level;
    const lvAfter = levelFor(pointsBefore + (log.points ?? 0)).level;
    if (lvAfter > lvBefore) celebrate('levelUp', `وصلت إلى المستوى ${ar(lvAfter)}!`);
    else if (!metBefore && metAfter) celebrate('goal', 'أحسنت! حققت هدف اليوم');
  }, [settings]);

  if (!ready) return <div class="screen" />;

  const app = { settings, progress, attempts, totals, voice, updateSetting, commitFinished, reload, go: setScreen };

  let body;
  switch (screen.name) {
    case 'map': body = <LessonMap app={app} />; break;
    case 'play': body = <Practice key={screen.key} app={app} lessonId={screen.lessonId} />; break;
    case 'summary': body = <Summary app={app} result={screen.result} />; break;
    case 'parent': body = <Parent app={app} />; break;
    default: body = <Home app={app} />;
  }
  return (
    <>
      {body}
      <Confetti burst={burst} />
      <Toast message={toast} onDone={() => setToast(null)} />
    </>
  );
}

render(<App />, document.getElementById('app'));
