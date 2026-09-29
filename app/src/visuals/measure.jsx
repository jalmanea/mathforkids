// Measurement visuals: money (grade 2 ch. 7), clock, ruler, area grids.
// SVGs use direction="ltr" so text-anchor behaves the same in RTL pages.

import { toArabicDigits as ar } from '../../../src/index.js';

// ---------- Money (Saudi riyals: 1 and 2 are coins, 5+ are notes) ----------

// Plain coloured notes and coins with the value: a teaching picture, not a copy of real currency.
const NOTE_COLORS = { 5: '#8e6cb8', 10: '#9a6b43', 50: '#3f8f5a', 100: '#c4546e', 500: '#3c6fb0' };

/** Riyal after a number: ٥ ريالات، ٥٠ ريالًا، ١٠٠ ريال. */
const riyals = (v) => (v <= 10 ? 'ريالات' : v % 100 === 0 ? 'ريال' : 'ريالًا');

export function Money({ items }) {
  const sorted = [...items].sort((a, b) => b.value - a.value);
  return (
    <div class="money">
      {sorted.map((it, i) =>
        it.form === 'coin' ? (
          <svg key={i} viewBox="0 0 56 56" width="56" height="56" direction="ltr" class="coin" role="img">
            <circle cx="28" cy="28" r="26" class={it.value === 2 ? 'coin-2' : 'coin-1'} />
            <circle cx="28" cy="28" r="20" class="coin-ring" />
            <text x="28" y="30" text-anchor="middle" class="coin-v">{ar(it.value)}</text>
            <text x="28" y="43" text-anchor="middle" class="coin-u">{it.value === 2 ? 'ريالان' : 'ريال'}</text>
          </svg>
        ) : (
          <svg key={i} viewBox="0 0 110 56" width="110" height="56" direction="ltr" class="note" role="img">
            <rect x="1" y="1" width="108" height="54" rx="6" fill={NOTE_COLORS[it.value] ?? '#777'} />
            <rect x="6" y="6" width="98" height="44" rx="4" class="note-inner" />
            <text x="20" y="36" text-anchor="middle" class="note-corner">{ar(it.value)}</text>
            <text x="68" y="28" text-anchor="middle" class="note-v">{ar(it.value)}</text>
            <text x="68" y="44" text-anchor="middle" class="note-u">{riyals(it.value)}</text>
          </svg>
        ),
      )}
    </div>
  );
}

// ---------- Analogue clock ----------

export function Clock({ hour, minute }) {
  const c = 100, R = 92;
  const hand = (angleDeg, len) => {
    const a = ((angleDeg - 90) * Math.PI) / 180;
    return { x2: c + len * Math.cos(a), y2: c + len * Math.sin(a) };
  };
  const hourAngle = ((hour % 12) + minute / 60) * 30;
  const minuteAngle = minute * 6;
  return (
    <svg viewBox="0 0 200 200" width="200" direction="ltr" class="clock" role="img">
      <circle cx={c} cy={c} r={R} class="clock-face" />
      {Array.from({ length: 60 }, (_, i) => {
        const a = (i * 6 - 90) * (Math.PI / 180);
        const r1 = i % 5 === 0 ? R - 10 : R - 5;
        return <line key={i} x1={c + r1 * Math.cos(a)} y1={c + r1 * Math.sin(a)} x2={c + (R - 1) * Math.cos(a)} y2={c + (R - 1) * Math.sin(a)} class={i % 5 === 0 ? 'tick-h' : 'tick-m'} />;
      })}
      {Array.from({ length: 12 }, (_, i) => {
        const h = i + 1;
        const a = (h * 30 - 90) * (Math.PI / 180);
        return <text key={h} x={c + (R - 24) * Math.cos(a)} y={c + (R - 24) * Math.sin(a) + 7} text-anchor="middle" class="clock-num">{ar(h)}</text>;
      })}
      <line x1={c} y1={c} {...hand(hourAngle, 48)} class="hand-h" />
      <line x1={c} y1={c} {...hand(minuteAngle, 72)} class="hand-m" />
      <circle cx={c} cy={c} r="5" class="clock-pin" />
    </svg>
  );
}

// ---------- Ruler with a pencil ----------

export function Ruler({ max, start, end }) {
  const cm = Math.min(18, 300 / (max + 1));
  const x0 = 12, W = x0 * 2 + max * cm, top = 44;
  const px = (v) => x0 + v * cm;
  return (
    <svg viewBox={`0 0 ${W} ${top + 50}`} width={W} direction="ltr" class="ruler" role="img">
      {/* pencil: tip at `end`, back at `start` */}
      <g>
        <rect x={px(start)} y="14" width={Math.max(0, px(end) - px(start) - 12)} height="16" class="pencil-body" />
        <rect x={px(start)} y="14" width="6" height="16" class="pencil-eraser" />
        <path d={`M${px(end) - 12},14 L${px(end)},22 L${px(end) - 12},30 Z`} class="pencil-tip" />
        <path d={`M${px(end) - 4},19.5 L${px(end)},22 L${px(end) - 4},24.5 Z`} class="pencil-lead" />
      </g>
      <line x1={px(start)} x2={px(start)} y1="10" y2={top} class="guide" />
      <line x1={px(end)} x2={px(end)} y1="10" y2={top} class="guide" />
      <rect x="2" y={top} width={W - 4} height="44" rx="4" class="ruler-body" />
      {Array.from({ length: max * 2 + 1 }, (_, i) => (
        <line key={i} x1={px(i / 2)} x2={px(i / 2)} y1={top} y2={top + (i % 2 ? 8 : 14)} class="ruler-tick" />
      ))}
      {Array.from({ length: max + 1 }, (_, v) => (
        <text key={v} x={px(v)} y={top + 30} text-anchor="middle" class="ruler-num">{ar(v)}</text>
      ))}
      <text x={W - 8} y={top + 40} text-anchor="end" class="ruler-unit">سم</text>
    </svg>
  );
}

// ---------- Area on a square grid ----------

const CELL = 26;

function GridBackground({ cols, rows }) {
  return (
    <>
      {Array.from({ length: cols + 1 }, (_, i) => <line key={`v${i}`} x1={i * CELL + 2} x2={i * CELL + 2} y1="2" y2={rows * CELL + 2} class="grid-line" />)}
      {Array.from({ length: rows + 1 }, (_, i) => <line key={`h${i}`} x1="2" x2={cols * CELL + 2} y1={i * CELL + 2} y2={i * CELL + 2} class="grid-line" />)}
    </>
  );
}

const cellRect = (col, row, cls, key) => <rect key={key} x={col * CELL + 2} y={row * CELL + 2} width={CELL} height={CELL} class={cls} />;

/**
 * A rows×cols block of unit squares; optionally an attached block on its
 * left (sharing the bottom edge) and half squares (diagonal halves) above it.
 */
export function GridArea({ rows, cols, attached, half_squares = 0 }) {
  const extraCols = attached?.cols ?? 0;
  const halfAbove = Math.min(half_squares, cols);
  const halfSide = half_squares - halfAbove;
  const topPad = halfAbove ? 1 : 0;
  const W = extraCols + cols + (halfSide ? 1 : 0) + 2;
  const H = rows + topPad + 2;
  const ox = 1 + extraCols, oy = 1 + topPad; // main block origin (in cells)
  const cells = [];
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) cells.push(cellRect(ox + c, oy + r, 'area-cell', `m${r}-${c}`));
  if (attached) {
    for (let r = 0; r < attached.rows; r++) for (let c = 0; c < attached.cols; c++) cells.push(cellRect(1 + c, oy + rows - 1 - r, 'area-cell', `a${r}-${c}`));
  }
  const tri = (col, row, key, flip) => {
    const x = col * CELL + 2, y = row * CELL + 2;
    const d = flip ? `M${x},${y + CELL} L${x + CELL},${y} L${x + CELL},${y + CELL} Z` : `M${x},${y + CELL} L${x + CELL},${y + CELL} L${x},${y} Z`;
    return <path key={key} d={d} class="area-cell" />;
  };
  for (let i = 0; i < halfAbove; i++) cells.push(tri(ox + i, oy - 1, `h${i}`, i % 2 === 1));
  for (let i = 0; i < halfSide; i++) cells.push(tri(ox + cols, oy + i, `s${i}`, false));
  return (
    <svg viewBox={`0 0 ${W * CELL + 4} ${H * CELL + 4}`} width={Math.min(320, W * CELL + 4)} class="area-grid" role="img">
      <GridBackground cols={W} rows={H} />
      {cells}
    </svg>
  );
}

/** Two rectangles (red and blue) on the same grid, for comparing area. */
export function GridShapes({ shapes }) {
  const [a, b] = shapes;
  const W = a.cols + b.cols + 3, H = Math.max(a.rows, b.rows) + 2;
  const draw = (s, x0, key) => {
    const out = [];
    for (let r = 0; r < s.rows; r++) for (let c = 0; c < s.cols; c++) out.push(cellRect(x0 + c, H - 1 - s.rows + r, `area-cell ${s.color}`, `${key}${r}-${c}`));
    return out;
  };
  // First shape (red) on the right, in reading order.
  return (
    <svg viewBox={`0 0 ${W * CELL + 4} ${H * CELL + 4}`} width={Math.min(320, W * CELL + 4)} class="area-grid" role="img">
      <GridBackground cols={W} rows={H} />
      {draw(b, 1, 'b')}
      {draw(a, b.cols + 2, 'a')}
    </svg>
  );
}
