import { useEffect, useState } from 'preact/hooks';
import { db, exportAll, importAll, resetAll } from '../db.js';
import { allLessons, lessonById, unitTitle, terms as allTerms, SUBJECTS } from '../curriculum.js';
import { dailyActivity, accuracyByUnit, needsPractice, sessionRows } from '../game/stats.js';
import { dayKey } from '../game/days.js';
import { Keypad, Icon, ar, count } from '../components.jsx';

const pct = (x) => `${ar(Math.round(x * 100))}٪`;
const WEEKDAYS = ['أحد', 'إثنين', 'ثلاثاء', 'أربعاء', 'خميس', 'جمعة', 'سبت'];

// ---------- PIN gate (a child lock, not security) ----------

function PinGate({ pin, onSet, onUnlock, onBack }) {
  const [value, setValue] = useState('');
  const [first, setFirst] = useState(null);
  const [error, setError] = useState('');
  const setting = !pin;
  const title = setting ? (first ? 'أعد إدخال الرمز للتأكيد' : 'اختر رمزًا من ٤ أرقام لركن الوالدين') : 'أدخل رمز ركن الوالدين';

  const submit = (v) => {
    if (v.length < 4) return;
    if (!setting) {
      if (v === pin) onUnlock();
      else { setError('الرمز غير صحيح'); setValue(''); }
    } else if (!first) {
      setFirst(v); setValue(''); setError('');
    } else if (v === first) {
      onSet(v);
    } else {
      setFirst(null); setValue(''); setError('الرمزان مختلفان، حاول من جديد');
    }
  };

  return (
    <main class="screen">
      <header class="topbar">
        <button class="icon-btn" onClick={onBack} aria-label="رجوع">{Icon.back}</button>
        <h1>ركن الوالدين</h1>
      </header>
      <section class="card center-text">
        <p style={{ margin: '0 0 8px', fontWeight: 700 }}>{title}</p>
        <div class="pin-dots" aria-label={`${ar(value.length)} من ٤`}>
          {[0, 1, 2, 3].map((i) => <span key={i} class={i < value.length ? 'on' : ''} />)}
        </div>
        <p class="feedback gentle" style={{ margin: 0 }}>{error}</p>
      </section>
      <Keypad
        value={value}
        maxLength={4}
        onChange={(v) => { setValue(v); if (v.length === 4) setTimeout(() => submit(v), 120); }}
        onSubmit={submit}
      />
    </main>
  );
}

// ---------- Charts (plain SVG) ----------

/** Single-series column chart over days. One measure per chart; no second axis. */
function DayBars({ rows, field, format, title }) {
  const W = 340, H = 150, top = 18, bottom = 26, left = 4, right = 4;
  const max = Math.max(1, ...rows.map((r) => r[field]));
  const bw = (W - left - right) / rows.length;
  const peak = rows.reduce((b, r, i) => (r[field] > rows[b][field] ? i : b), 0);
  const [sel, setSel] = useState(null);
  return (
    <div class="card chart">
      <div class="section-title">{title}</div>
      {/* Days run right-to-left (oldest on the right), matching Arabic reading order. */}
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={title}>
        <line class="axis" x1={left} x2={W - right} y1={H - bottom} y2={H - bottom} stroke-width="1" />
        {rows.map((r, i) => {
          const x = W - right - (i + 1) * bw;
          const h = ((H - top - bottom) * r[field]) / max;
          const d = new Date(r.day + 'T12:00');
          const showLabel = r[field] > 0 && (i === peak || i === sel || i === rows.length - 1);
          return (
            <g key={r.day} onClick={() => setSel(i === sel ? null : i)}>
              <rect x={x} y={top} width={bw} height={H - top - bottom} fill="transparent" />
              {h > 0 && <path class="bar" d={roundedTop(x + 2, H - bottom - h, bw - 4, h, Math.min(4, (bw - 4) / 2))} opacity={sel === null || sel === i ? 1 : 0.45} />}
              {showLabel && <text class="val" x={x + bw / 2} y={H - bottom - h - 5} text-anchor="middle">{format(r[field])}</text>}
              {(i % 2 === 1 || i === sel) && (
                <text x={x + bw / 2} y={H - 8} text-anchor="middle">{i === rows.length - 1 ? 'اليوم' : ar(d.getDate())}</text>
              )}
              <title>{`${WEEKDAYS[d.getDay()]} ${ar(d.getDate())}/${ar(d.getMonth() + 1)}: ${format(r[field])}`}</title>
            </g>
          );
        })}
      </svg>
      {sel !== null && (
        <p class="muted" style={{ margin: '6px 0 0', fontSize: '15px' }}>
          {WEEKDAYS[new Date(rows[sel].day + 'T12:00').getDay()]} {ar(rows[sel].day.slice(8))}/{ar(rows[sel].day.slice(5, 7))}: {format(rows[sel][field])}
        </p>
      )}
    </div>
  );
}

function roundedTop(x, y, w, h, r) {
  r = Math.min(r, h);
  return `M${x},${y + h}V${y + r}Q${x},${y} ${x + r},${y}H${x + w - r}Q${x + w},${y} ${x + w},${y + r}V${y + h}Z`;
}

function AccRow({ label, acc, n, unit }) {
  return (
    <div class={`acc-row ${unit ? 'unit-row' : ''}`}>
      <span>{label} <span class="muted" style={{ fontSize: '13px', fontWeight: 400 }}>({ar(n)})</span></span>
      <div class="acc-bar" aria-hidden="true"><div class={acc < 0.7 ? 'low' : ''} style={{ width: `${Math.round(acc * 100)}%` }} /></div>
      <span>{pct(acc)}</span>
    </div>
  );
}

// ---------- Report ----------

function Report({ attempts, sessions }) {
  const days = dailyActivity(attempts, 14);
  const units = accuracyByUnit(attempts, allLessons);
  const weak = needsPractice(attempts);
  const rows = sessionRows(sessions, attempts).slice(0, 30);
  const total = days.reduce((s, d) => s + d.exercises, 0);
  const minutes = days.reduce((s, d) => s + d.minutes, 0);

  return (
    <>
      <p class="muted" style={{ margin: 0 }}>
        آخر ١٤ يومًا: {count(total, 'exercise')} في {count(Math.round(minutes), 'minute', 'gen')}
      </p>
      <DayBars rows={days} field="exercises" title="التمارين في اليوم" format={(v) => ar(v)} />
      <DayBars rows={days} field="minutes" title="الدقائق في اليوم" format={(v) => ar(Math.round(v))} />

      <section class="card">
        <div class="section-title">الدقة من المحاولة الأولى</div>
        {!units.length && <p class="empty">لا توجد بيانات بعد.</p>}
        {units.map((u) => (
          <div key={u.unit_id}>
            <AccRow unit label={unitTitle(u.unit_id)} acc={u.acc} n={u.n} />
            {u.lessons.map((l) => <AccRow key={l.lesson_id} label={lessonById.get(l.lesson_id)?.title ?? l.lesson_id} acc={l.acc} n={l.n} />)}
          </div>
        ))}
        <p class="muted" style={{ margin: '8px 0 0', fontSize: '13px' }}>بين القوسين: عدد التمارين.</p>
      </section>

      <section class="card">
        <div class="section-title">تحتاج إلى تدريب</div>
        {!weak.length && <p class="empty">لا توجد مهارات ضعيفة حاليًا (أقل من ٧٠٪ بعد ٥ تمارين على الأقل).</p>}
        <ul class="list">
          {weak.map((s) => (
            <li key={s.skill}>
              <span>
                {lessonById.get(s.lesson_id)?.title}
                <span class="muted" style={{ display: 'block', fontSize: '12px', direction: 'ltr', textAlign: 'right' }}>{s.skill}</span>
              </span>
              <strong>{pct(s.acc)}</strong>
            </li>
          ))}
        </ul>
      </section>

      <section class="card">
        <div class="section-title">الجلسات</div>
        {!rows.length && <p class="empty">لا توجد جلسات بعد.</p>}
        <ul class="list">
          {rows.map((s) => {
            const d = new Date(s.started_at);
            return (
              <li key={s.session_id}>
                <span>
                  {WEEKDAYS[d.getDay()]} {ar(d.getDate())}/{ar(d.getMonth() + 1)}، {ar(String(d.getHours()).padStart(2, '0'))}:{ar(String(d.getMinutes()).padStart(2, '0'))}
                  <span class="muted" style={{ display: 'block', fontSize: '13px' }}>{lessonById.get(s.lesson_id)?.title}</span>
                </span>
                <span style={{ textAlign: 'left', whiteSpace: 'nowrap' }}>
                  {count(s.exercises, 'exercise')}
                  <span class="muted" style={{ display: 'block', fontSize: '13px' }}>{pct(s.acc)}، {count(Math.max(1, Math.round(s.minutes)), 'minute')}</span>
                </span>
              </li>
            );
          })}
        </ul>
      </section>
    </>
  );
}

// ---------- Settings ----------

function Seg({ options, value, onChange }) {
  return (
    <div class="seg">
      {options.map(([v, label]) => (
        <button key={String(v)} aria-pressed={value === v} onClick={() => onChange(v)}>{label}</button>
      ))}
    </div>
  );
}

function Switch({ on, onChange, label }) {
  return <button class="switch" role="switch" aria-checked={on} aria-label={label} onClick={() => onChange(!on)} />;
}

function Settings({ app }) {
  const { settings: s, updateSetting, voice } = app;
  const terms = allTerms.map((t) => [`${t.grade}-${t.semester}`, `الصف ${ar(t.grade)}، الفصل ${ar(t.semester)}`]);
  return (
    <section class="card">
      <div class="setting">
        <span class="name">المظهر</span>
        <Seg options={[['neutral', 'هادئ'], ['stitch', 'استوائي']]} value={s.theme} onChange={(v) => updateSetting('theme', v)} />
      </div>
      <div class="setting">
        <span class="name">الأصوات</span>
        <Switch on={s.sound} label="الأصوات" onChange={(v) => updateSetting('sound', v)} />
      </div>
      <div class="setting">
        <span class="name">
          القراءة بصوت عالٍ
          {!voice && <span class="muted" style={{ display: 'block', fontSize: '13px', fontWeight: 400 }}>لا يوجد صوت عربي على هذا الجهاز</span>}
        </span>
        <Switch on={s.readAloud} label="القراءة بصوت عالٍ" onChange={(v) => updateSetting('readAloud', v)} />
      </div>
      <div class="setting">
        <span class="name">هدف اليوم</span>
        <span class="stepper">
          <button onClick={() => updateSetting('dailyGoal', Math.min(40, s.dailyGoal + 5))} aria-label="زيادة">+</button>
          <span>{ar(s.dailyGoal)}</span>
          <button onClick={() => updateSetting('dailyGoal', Math.max(5, s.dailyGoal - 5))} aria-label="إنقاص">−</button>
        </span>
      </div>
      <div class="setting">
        <span class="name">المادة</span>
        <Seg options={SUBJECTS.map((x) => [x.key, x.label])} value={s.subject} onChange={(v) => updateSetting('subject', v)} />
      </div>
      <div class="setting" style={{ flexWrap: 'wrap' }}>
        <span class="name">الصف والفصل</span>
        <select
          value={`${s.grade}-${s.semester}`}
          onChange={async (e) => {
            const [g, t] = e.currentTarget.value.split('-').map(Number);
            await updateSetting('grade', g);
            await updateSetting('semester', t);
          }}
          style={{ font: 'inherit', fontSize: '16px', padding: '8px', borderRadius: '10px', border: '1px solid var(--border)', background: 'var(--surface)' }}
        >
          {terms.map(([v, label]) => <option key={v} value={v}>{label}</option>)}
        </select>
      </div>
      <div class="setting">
        <span class="name">رمز ركن الوالدين</span>
        <button class="btn secondary small" onClick={() => updateSetting('pin', null)}>تغيير الرمز</button>
      </div>
    </section>
  );
}

// ---------- Data (backup / restore / reset) ----------

async function saveBackup() {
  const data = await exportAll();
  const name = `math-backup-${dayKey(new Date())}.json`;
  const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
  const file = new File([blob], name, { type: 'application/json' });
  // iOS home-screen apps cannot download; the share sheet can save to Files.
  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: name });
      return;
    } catch (e) {
      if (e.name === 'AbortError') return;
    }
  }
  const url = URL.createObjectURL(blob);
  const a = Object.assign(document.createElement('a'), { href: url, download: name });
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function DataTab({ app, counts }) {
  const [msg, setMsg] = useState('');
  const onImport = async (e) => {
    const f = e.currentTarget.files?.[0];
    e.currentTarget.value = '';
    if (!f) return;
    try {
      const backup = JSON.parse(await f.text());
      if (!confirm('سيُستبدل كل ما في التطبيق بمحتوى النسخة الاحتياطية. متابعة؟')) return;
      await importAll(backup);
      await app.reload();
      setMsg(`تمت الاستعادة: ${count(backup.tables.attempts?.length ?? 0, 'exercise')}`);
    } catch {
      setMsg('تعذّرت قراءة الملف. تأكد أنه نسخة احتياطية من هذا التطبيق.');
    }
  };
  const onReset = async () => {
    if (!confirm('سيُحذف كل التقدم والسجلات والإعدادات من هذا الجهاز. هل أنت متأكد؟')) return;
    if (!confirm('تأكيد أخير: لا يمكن التراجع إلا من نسخة احتياطية.')) return;
    await resetAll();
    await app.reload();
    app.go({ name: 'home' });
  };
  return (
    <section class="card" style={{ display: 'grid', gap: '12px' }}>
      <p class="muted" style={{ margin: 0 }}>
        كل البيانات محفوظة على هذا الجهاز فقط: {count(counts.attempts, 'exercise')} و{ar(counts.sessions)} جلسة.
      </p>
      <button class="btn" onClick={() => saveBackup().catch(() => setMsg('تعذّر حفظ النسخة الاحتياطية'))}>حفظ نسخة احتياطية</button>
      <label class="btn secondary">
        استعادة من نسخة احتياطية
        <input type="file" accept="application/json,.json" onChange={onImport} style={{ display: 'none' }} />
      </label>
      <button class="btn danger" onClick={onReset}>مسح كل البيانات</button>
      {msg && <p class="center-text" role="status" style={{ margin: 0 }}>{msg}</p>}
    </section>
  );
}

// ---------- Screen ----------

export function Parent({ app }) {
  const { settings, go, updateSetting } = app;
  const [unlocked, setUnlocked] = useState(false);
  const [tab, setTab] = useState('report');
  const [data, setData] = useState(null);

  useEffect(() => {
    if (!unlocked) return;
    (async () => {
      const [attempts, sessions] = await Promise.all([db.attempts.toArray(), db.sessions.toArray()]);
      setData({ attempts, sessions });
    })();
  }, [unlocked, app.attempts]);

  if (!unlocked) {
    return (
      <PinGate
        pin={settings.pin}
        onBack={() => go({ name: 'home' })}
        onSet={async (p) => { await updateSetting('pin', p); setUnlocked(true); }}
        onUnlock={() => setUnlocked(true)}
      />
    );
  }

  return (
    <main class="screen">
      <header class="topbar">
        <button class="icon-btn" onClick={() => go({ name: 'home' })} aria-label="رجوع">{Icon.back}</button>
        <h1>ركن الوالدين</h1>
      </header>
      <div class="tabs" role="tablist">
        {[['report', 'التقرير'], ['settings', 'الإعدادات'], ['data', 'البيانات']].map(([k, label]) => (
          <button key={k} role="tab" aria-selected={tab === k} onClick={() => setTab(k)}>{label}</button>
        ))}
      </div>
      {tab === 'report' && (data ? <Report attempts={data.attempts} sessions={data.sessions} /> : <p class="empty">…</p>)}
      {tab === 'settings' && <Settings app={app} />}
      {tab === 'data' && data && <DataTab app={app} counts={{ attempts: data.attempts.filter((a) => a.outcome !== 'in_progress').length, sessions: data.sessions.length }} />}
    </main>
  );
}
