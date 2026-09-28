import { toArabicDigits } from '../../../src/index.js';

const PLACE_NAMES = ['الآحاد', 'العشرات', 'المئات', 'الألوف', 'عشرات الألوف', 'مئات الألوف'];

// Columns line up with the written number: the highest place on the left,
// ones on the right, as in the textbook's place-value table.
export function PlaceValueChart({ places }) {
  const cols = [...places].sort((a, b) => b.place - a.place);
  const w = 88;
  const width = cols.length * w;
  return (
    <svg class="pv-chart" viewBox={`0 0 ${width} 116`} width={width} role="img">
      {cols.map((c, i) => (
        <g key={c.place} transform={`translate(${i * w},0)`}>
          <rect x="2" y="2" width={w - 4} height="44" rx="10" class="pv-head" />
          <text x={w / 2} y="30" class="pv-head-text">{PLACE_NAMES[c.place]}</text>
          <rect x="2" y="52" width={w - 4} height="60" rx="10" class="pv-cell" />
          <text x={w / 2} y="95" class="pv-digit">{c.digit == null ? '؟' : toArabicDigits(c.digit)}</text>
        </g>
      ))}
    </svg>
  );
}
