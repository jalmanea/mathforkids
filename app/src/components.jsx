import { useCallback, useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { toArabicDigits } from '../../src/index.js';
import { countNoun } from '../../src/core/arabic.js';

export const ar = toArabicDigits;

const APP_NOUNS = {
  exercise: { one: 'تمرين', two: 'تمرينان', few: 'تمارين', many: 'تمرينًا', g: 'm' },
  day: { one: 'يوم', two: 'يومان', few: 'أيام', many: 'يومًا', g: 'm' },
  minute: { one: 'دقيقة', two: 'دقيقتان', few: 'دقائق', many: 'دقيقة', g: 'f' },
  point: { one: 'نقطة', two: 'نقطتان', few: 'نقاط', many: 'نقطة', g: 'f' },
};

/** "٣ تمارين", "٢٠ تمرينًا", "تمرينان"… with number–noun agreement. */
export function count(n, noun, kase = 'nom') {
  return n === 0 ? `${ar(0)} ${APP_NOUNS[noun].one}` : countNoun(n, APP_NOUNS[noun], kase);
}

export function Stars({ count, label }) {
  return (
    <span class="stars" aria-label={label ?? `${ar(count)} من ٣ نجوم`}>
      {[0, 1, 2].map((i) => (
        <span key={i} class={i < count ? 'on' : 'off'}>★</span>
      ))}
    </span>
  );
}

export function GoalRing({ done, goal }) {
  const r = 84;
  const c = 2 * Math.PI * r;
  const frac = Math.min(1, done / goal);
  return (
    <div class={`goal-ring ${done >= goal ? 'done' : ''}`}>
      <svg viewBox="0 0 196 196" aria-hidden="true">
        <circle cx="98" cy="98" r={r} fill="none" stroke-width="18" class="track" />
        <circle cx="98" cy="98" r={r} fill="none" stroke-width="18" stroke-linecap="round" class="fill"
          stroke-dasharray={c} stroke-dashoffset={c * (1 - frac)} />
      </svg>
      <div class="center">
        <div class="big">{ar(Math.min(done, goal))}</div>
        <div class="muted">من {count(goal, 'exercise', 'gen')}</div>
      </div>
    </div>
  );
}

/** Falling confetti in the theme's colours. `burst` changes → new burst. */
export function Confetti({ burst }) {
  const [pieces, setPieces] = useState([]);
  useEffect(() => {
    if (!burst) return;
    const colors = getComputedStyle(document.documentElement).getPropertyValue('--confetti').split(',').map((s) => s.trim());
    setPieces(Array.from({ length: 90 }, (_, i) => ({
      id: `${burst}-${i}`,
      left: Math.random() * 100,
      delay: Math.random() * 0.5,
      dur: 1.8 + Math.random() * 1.4,
      dx: `${(Math.random() - 0.5) * 160}px`,
      rot: `${360 + Math.random() * 720}deg`,
      color: colors[i % colors.length],
    })));
    const t = setTimeout(() => setPieces([]), 3600);
    return () => clearTimeout(t);
  }, [burst]);
  if (!pieces.length) return null;
  return (
    <div class="confetti" aria-hidden="true">
      {pieces.map((p) => (
        <i key={p.id} style={{ left: `${p.left}%`, background: p.color, animationDuration: `${p.dur}s`, animationDelay: `${p.delay}s`, '--dx': p.dx, '--rot': p.rot }} />
      ))}
    </div>
  );
}

export function Toast({ message, onDone }) {
  useEffect(() => {
    if (!message) return;
    const t = setTimeout(onDone, 2600);
    return () => clearTimeout(t);
  }, [message]);
  if (!message) return null;
  return <div class="toast" role="status">{message}</div>;
}

const DIGITS = '٠١٢٣٤٥٦٧٨٩';

/**
 * Arabic-Indic number pad. Laid out left-to-right like a phone keypad.
 * Also accepts a hardware keyboard (Western or Arabic digits, Backspace, Enter).
 */
export function Keypad({ value, onChange, onSubmit, maxLength = 6, disabled, submitLabel = 'تحقق' }) {
  // Refs, not closures: fast taps and typing can arrive before the next render.
  const ref = useRef({});
  ref.current = { ...ref.current, onChange, onSubmit, maxLength, disabled };
  if (ref.current.rendered !== value) ref.current.value = ref.current.rendered = value;

  const act = useCallback((k) => {
    const s = ref.current;
    if (s.disabled) return false;
    let v = s.value;
    if (DIGITS.includes(k)) {
      if (v.length >= s.maxLength) return true;
      v += k;
    } else if (k === 'del') v = v.slice(0, -1);
    else if (k === 'ok') {
      // The parent clears or keeps its own `value`; either way the next digit starts a new answer.
      if (v) {
        s.value = '';
        s.onSubmit(v);
      }
      return true;
    } else return false;
    s.value = v;
    s.onChange(v);
    return true;
  }, []);

  useEffect(() => {
    const onKey = (e) => {
      const i = '0123456789'.indexOf(e.key);
      const k = i >= 0 ? DIGITS[i] : DIGITS.includes(e.key) ? e.key : e.key === 'Backspace' ? 'del' : e.key === 'Enter' ? 'ok' : null;
      if (k && act(k)) e.preventDefault();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const keys = useMemo(() => ['١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'], []);
  return (
    <div class="keypad" role="group" aria-label="لوحة الأرقام">
      {keys.map((d) => (
        <button key={d} class="key" onClick={() => act(d)} disabled={disabled}>{d}</button>
      ))}
      <button class="key del" onClick={() => act('del')} disabled={disabled} aria-label="مسح">⌫</button>
      <button class="key" onClick={() => act('٠')} disabled={disabled}>٠</button>
      <button class="key ok" onClick={() => act('ok')} disabled={disabled || !value} aria-label={submitLabel}>✓</button>
    </div>
  );
}

export const Icon = {
  back: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M9 6l6 6-6 6" /></svg>
  ),
  close: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg>
  ),
  speaker: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 9v6h4l5 4V5L8 9H4z" fill="currentColor" /><path d="M16.5 8.5a5 5 0 010 7M19 6a8.5 8.5 0 010 12" /></svg>
  ),
  lock: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="5" y="11" width="14" height="9" rx="2" /><path d="M8 11V8a4 4 0 018 0v3" /></svg>
  ),
  map: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 4L3 6v14l6-2 6 2 6-2V4l-6 2-6-2z" /><path d="M9 4v14M15 6v14" /></svg>
  ),
};
