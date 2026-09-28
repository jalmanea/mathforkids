// Renderers for counting, data and chance visuals (grade 2 ch. 1 and 4,
// grade 3 ch. 10). None of them print the values being asked about: the
// child reads them off the marks, symbols or bars, as in the textbook.
//
// SVGs set direction="ltr" so text-anchor means the same in every document
// direction; the layout itself follows Arabic reading order (first category
// on the right).

import { toArabicDigits as ar } from '../../../src/index.js';

/** Small deterministic PRNG so a picture does not reshuffle on re-render. */
function seeded(seed) {
  let s = seed >>> 0 || 1;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
}

function starPath(cx, cy, R) {
  let d = '';
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const r = i % 2 ? R * 0.45 : R;
    d += `${i ? 'L' : 'M'}${(cx + r * Math.cos(a)).toFixed(1)},${(cy + r * Math.sin(a)).toFixed(1)}`;
  }
  return d + 'Z';
}

// ---------- Estimation: a scattered group next to a reference group of 10 ----------

export function ObjectCloud({ count, benchmark = 10 }) {
  const W = 300, H = 200, cell = 20;
  const cols = Math.floor(W / cell), rows = Math.floor(H / cell);
  const rnd = seeded(count * 7919 + 17);
  const cells = Array.from({ length: cols * rows }, (_, i) => i);
  for (let i = cells.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [cells[i], cells[j]] = [cells[j], cells[i]];
  }
  const stars = cells.slice(0, count).map((c) => ({
    x: (c % cols) * cell + cell / 2 + (rnd() - 0.5) * 5,
    y: Math.floor(c / cols) * cell + cell / 2 + (rnd() - 0.5) * 5,
  }));
  return (
    <div class="cloud">
      <div class="cloud-ref">
        <svg viewBox="0 0 110 48" width="110" role="img">
          {Array.from({ length: benchmark }, (_, i) => (
            <path key={i} class="cloud-obj" d={starPath(11 + (i % 5) * 22, 12 + Math.floor(i / 5) * 24, 8)} />
          ))}
        </svg>
        <span>هذه {ar(benchmark)} نجوم</span>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} width={W} role="img" class="cloud-main">
        {stars.map((s, i) => <path key={i} class="cloud-obj" d={starPath(s.x, s.y, 7.5)} />)}
      </svg>
    </div>
  );
}

// ---------- Tally table ----------

export function Tally({ n }) {
  const groups = Math.ceil(n / 5);
  const w = groups * 44;
  return (
    <svg viewBox={`0 0 ${Math.max(w, 10)} 30`} width={Math.max(w, 10)} height="30" class="tally" aria-hidden="true">
      {Array.from({ length: groups }, (_, g) => {
        const inGroup = Math.min(5, n - g * 5);
        const x0 = g * 44 + 6;
        return (
          <g key={g}>
            {Array.from({ length: Math.min(4, inGroup) }, (_, k) => (
              <line key={k} x1={x0 + k * 8} x2={x0 + k * 8} y1="3" y2="27" />
            ))}
            {inGroup === 5 && <line x1={x0 - 4} x2={x0 + 28} y1="22" y2="8" />}
          </g>
        );
      })}
    </svg>
  );
}

export function TallyTable({ title, rows }) {
  return (
    <div class="data-vis">
      {title && <div class="data-title">{title}</div>}
      <table class="data-table">
        <thead><tr><th>الاختيار</th><th>إشارات العدّ</th></tr></thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.label}><td>{r.label}</td><td class="marks"><Tally n={r.value} /></td></tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ---------- Pictograph ----------

function Face({ size = 22 }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} class="picto-sym" aria-hidden="true">
      <circle cx="12" cy="12" r="11" class="face" />
      <circle cx="8.5" cy="10" r="1.6" class="eye" />
      <circle cx="15.5" cy="10" r="1.6" class="eye" />
      <path d="M7.5 14.5q4.5 4 9 0" class="smile" />
    </svg>
  );
}

export function Pictograph({ title, key_label, rows }) {
  return (
    <div class="data-vis">
      {title && <div class="data-title">{title}</div>}
      <table class="data-table picto">
        <tbody>
          {rows.map((r) => (
            <tr key={r.label}>
              <td>{r.label}</td>
              <td><span class="picto-row">{Array.from({ length: r.symbols }, (_, i) => <Face key={i} />)}</span></td>
            </tr>
          ))}
        </tbody>
      </table>
      <div class="picto-key"><Face size={20} /> <span>{key_label}</span></div>
    </div>
  );
}

// ---------- Bar graph ----------

export function BarGraph({ title, axis_step, bars }) {
  const W = 320, H = 230, top = 12, bottom = 34, axisW = 30, left = 6;
  const maxV = Math.max(...bars.map((b) => b.value));
  const ticks = Math.max(1, Math.ceil(maxV / axis_step) + (maxV % axis_step === 0 ? 1 : 0));
  const maxAxis = ticks * axis_step;
  const plotR = W - axisW, plotW = plotR - left, plotH = H - top - bottom;
  const y = (v) => top + plotH - (plotH * v) / maxAxis;
  const slot = plotW / bars.length;
  const bw = Math.min(46, slot * 0.56);
  const labelEvery = ticks > 10 ? 2 : 1;
  return (
    <div class="data-vis">
      {title && <div class="data-title">{title}</div>}
      <svg viewBox={`0 0 ${W} ${H}`} width={W} direction="ltr" class="bar-graph" role="img">
        {Array.from({ length: ticks + 1 }, (_, i) => {
          const v = i * axis_step;
          return (
            <g key={i}>
              <line class={i ? 'grid' : 'base'} x1={left} x2={plotR} y1={y(v)} y2={y(v)} />
              {i % labelEvery === 0 && <text x={plotR + 6} y={y(v) + 4} text-anchor="start" class="tick">{ar(v)}</text>}
            </g>
          );
        })}
        {bars.map((b, i) => {
          // First category on the right, like the rest of the page.
          const cx = plotR - slot * (i + 0.5);
          const h = y(0) - y(b.value);
          const r = Math.min(4, h);
          const x = cx - bw / 2, yt = y(b.value);
          return (
            <g key={b.label}>
              {h > 0 && <path class="bar" d={`M${x},${y(0)}V${yt + r}Q${x},${yt} ${x + r},${yt}H${x + bw - r}Q${x + bw},${yt} ${x + bw},${yt + r}V${y(0)}Z`} />}
              <text x={cx} y={H - 12} text-anchor="middle" class="cat">{b.label}</text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

// ---------- Plain table (e.g. "make a table" problems) ----------

export function DataTable({ columns, rows, open }) {
  return (
    <table class="data-table numeric">
      <thead><tr>{columns.map((c) => <th key={c}>{c}</th>)}</tr></thead>
      <tbody>
        {rows.map((r, i) => <tr key={i}>{r.map((v, j) => <td key={j}>{typeof v === 'number' ? ar(v) : v}</td>)}</tr>)}
        {open && <tr>{columns.map((c) => <td key={c} class="muted">…</td>)}</tr>}
      </tbody>
    </table>
  );
}

// ---------- Chance: a bag of coloured balls ----------

const BALL = { الحمراء: '#e0453a', الزرقاء: '#2f6fd6', الخضراء: '#2e9e55', الصفراء: '#f2c230' };

export function Bag({ items }) {
  const balls = items.flatMap((it) => Array.from({ length: it.count }, () => BALL[it.color] ?? '#999'));
  const rnd = seeded(balls.length * 131 + items.length);
  for (let i = balls.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [balls[i], balls[j]] = [balls[j], balls[i]];
  }
  const per = balls.length > 12 ? 5 : 4;
  const rows = Math.ceil(balls.length / per);
  const W = 200, top = 44, r = 13, gap = 30;
  const H = top + rows * gap + 22;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width={W} class="bag" role="img">
      <path class="bag-body" d={`M40,${top - 14} C18,${top + 10} 14,${H - 10} 36,${H - 4} H164 C186,${H - 10} 182,${top + 10} 160,${top - 14} Z`} />
      <path class="bag-tie" d={`M72,${top - 16} Q100,${top - 4} 128,${top - 16} M84,${top - 18} Q100,4 116,${top - 18}`} />
      {balls.map((c, i) => {
        const row = Math.floor(i / per), inRow = row === rows - 1 ? balls.length - row * per : per;
        const col = i % per;
        return <circle key={i} cx={W / 2 + (col - (inRow - 1) / 2) * gap} cy={top + 10 + row * gap} r={r} fill={c} class="ball" />;
      })}
    </svg>
  );
}
