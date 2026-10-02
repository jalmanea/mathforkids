// Geometry visuals: plane shapes, solids, shape patterns, composing shapes,
// perimeter polygons, cube stacks (volume) and rows of tables.
// SVGs use direction="ltr"; Arabic labels set direction="rtl" themselves.

import { toArabicDigits as ar } from '../../../src/index.js';

const f = (v) => v.toFixed(1);
const poly = (pts) => pts.map(([x, y]) => `${f(x)},${f(y)}`).join(' ');

function regular(k, cx, cy, r, rot = -Math.PI / 2) {
  return Array.from({ length: k }, (_, i) => {
    const a = rot + (2 * Math.PI * i) / k;
    return [cx + r * Math.cos(a), cy + r * Math.sin(a)];
  });
}

function star(cx, cy, R) {
  return Array.from({ length: 10 }, (_, i) => {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const r = i % 2 ? R * 0.45 : R;
    return [cx + r * Math.cos(a), cy + r * Math.sin(a)];
  });
}

/** Outline points of a named plane shape inside a 120×120 box (null for curved shapes). */
function shapePoints(name) {
  switch (name) {
    case 'مثلث':
    case 'مثلث متطابق الأضلاع': return regular(3, 60, 68, 52);
    case 'مثلث متطابق الضلعين': return [[60, 8], [96, 108], [24, 108]];
    case 'مثلث مختلف الأضلاع': return [[20, 104], [108, 104], [78, 22]];
    case 'مربع': return [[18, 18], [102, 18], [102, 102], [18, 102]];
    case 'مستطيل': return [[6, 32], [114, 32], [114, 88], [6, 88]];
    case 'شكل رباعي': return [[22, 26], [96, 14], [110, 100], [12, 88]];
    case 'متوازي أضلاع': return [[34, 30], [116, 30], [86, 90], [4, 90]];
    case 'شبه منحرف': return [[36, 30], [84, 30], [114, 92], [6, 92]];
    case 'شكل خماسي': return regular(5, 60, 64, 54);
    case 'شكل سداسي': return regular(6, 60, 60, 54, 0);
    case 'شكل ثماني': return regular(8, 60, 60, 54, Math.PI / 8);
    case 'نجمة': return star(60, 64, 56);
    default: return null;
  }
}

/** One plane shape as SVG children in a 120×120 box. */
export function ShapeGlyph({ name, cls = 'shape' }) {
  if (name === 'دائرة') return <circle cx="60" cy="60" r="50" class={cls} />;
  if (name === 'قلب') return <path d="M60,104 C20,76 6,52 18,32 C30,12 54,16 60,36 C66,16 90,12 102,32 C114,52 100,76 60,104 Z" class={cls} />;
  const pts = shapePoints(name);
  return pts ? <polygon points={poly(pts)} class={cls} /> : <text x="60" y="66" text-anchor="middle" direction="rtl">{name}</text>;
}

export function PlaneShape({ shape }) {
  return (
    <svg viewBox="-4 -4 128 128" width="150" direction="ltr" class="plane" role="img">
      <ShapeGlyph name={shape} />
    </svg>
  );
}

// ---------- Shape pattern with the missing one hidden ----------

const PATTERN_CLASS = { مربع: 'c1', دائرة: 'c2', مثلث: 'c3', مستطيل: 'c4', نجمة: 'c5' };

export function ShapeSequence({ shapes, missing_index }) {
  return (
    <div class="shape-seq">
      {shapes.map((s, i) =>
        i === missing_index ? (
          <span key={i} class="seq-missing">؟</span>
        ) : (
          <svg key={i} viewBox="-4 -4 128 128" direction="ltr" aria-hidden="true">
            <ShapeGlyph name={s} cls={`shape ${PATTERN_CLASS[s] ?? ''}`} />
          </svg>
        ),
      )}
    </div>
  );
}

// ---------- Solids ----------

/** Visible edges, hidden (dashed) edges, faces to tint and vertices for each solid. */
function solidModel(name) {
  const box = (x, y, w, h, dx, dy) => {
    const F = [[x, y], [x + w, y], [x + w, y + h], [x, y + h]];
    const B = F.map(([px, py]) => [px + dx, py - dy]);
    return {
      faces: [F, [F[0], F[1], B[1], B[0]], [F[1], B[1], B[2], F[2]]],
      edges: [[F[0], F[1]], [F[1], F[2]], [F[2], F[3]], [F[3], F[0]], [F[0], B[0]], [F[1], B[1]], [F[2], B[2]], [B[0], B[1]], [B[1], B[2]]],
      hidden: [[B[0], B[3]], [B[3], B[2]], [F[3], B[3]]],
      vertices: [...F, ...B],
      hiddenVertices: [B[3]],
    };
  };
  switch (name) {
    case 'مكعب': return box(28, 52, 72, 72, 34, 34);
    case 'متوازي مستطيلات': return box(14, 62, 104, 58, 30, 30);
    case 'هرم':
    case 'هرم رباعي': {
      const A = [20, 118], B = [108, 118], C = [140, 92], D = [52, 92], E = [80, 16];
      return { faces: [[A, B, E], [B, C, E]], edges: [[A, B], [B, C], [A, E], [B, E], [C, E]], hidden: [[C, D], [D, A], [D, E]], vertices: [A, B, C, D, E], hiddenVertices: [D] };
    }
    default: return null;
  }
}

export function Solid({ solid, highlight }) {
  const m = solidModel(solid);
  const line = ([a, b], i, cls) => <line key={`${cls}${i}`} x1={a[0]} y1={a[1]} x2={b[0]} y2={b[1]} class={cls} />;
  let body;
  if (m) {
    body = (
      <>
        {m.faces.map((pts, i) => <polygon key={i} points={poly(pts)} class={`solid-face s${i}`} />)}
        {m.hidden.map((e, i) => line(e, i, 'solid-hidden'))}
        {m.edges.map((e, i) => line(e, i, 'solid-edge'))}
        {highlight === 'vertices' && m.vertices.map(([x, y], i) => (
          <circle key={`v${i}`} cx={x} cy={y} r="5" class={m.hiddenVertices.includes(m.vertices[i]) ? 'solid-vertex hidden' : 'solid-vertex'} />
        ))}
      </>
    );
  } else if (solid === 'أسطوانة') {
    body = (
      <>
        <path d="M30,34 V114 A50,14 0 0 0 130,114 V34 Z" class="solid-face s0" />
        <ellipse cx="80" cy="34" rx="50" ry="14" class="solid-face s1" />
        <path d="M30,114 A50,14 0 0 1 130,114" class="solid-hidden" />
        <path d="M30,34 V114 A50,14 0 0 0 130,114 V34" class="solid-edge" />
        <ellipse cx="80" cy="34" rx="50" ry="14" class="solid-edge" fill="none" />
      </>
    );
  } else if (solid === 'مخروط') {
    body = (
      <>
        <path d="M80,14 L30,112 A50,14 0 0 0 130,112 Z" class="solid-face s0" />
        <path d="M30,112 A50,14 0 0 1 130,112" class="solid-hidden" />
        <path d="M80,14 L30,112 A50,14 0 0 0 130,112 Z" class="solid-edge" fill="none" />
      </>
    );
  } else if (solid === 'كرة') {
    body = (
      <>
        <circle cx="80" cy="70" r="56" class="solid-face s0" />
        <path d="M24,70 A56,16 0 0 1 136,70" class="solid-hidden" />
        <path d="M24,70 A56,16 0 0 0 136,70" class="solid-edge" fill="none" />
        <circle cx="80" cy="70" r="56" class="solid-edge" fill="none" />
      </>
    );
  }
  return <svg viewBox="0 0 160 140" width="170" direction="ltr" class="solid" role="img">{body}</svg>;
}

// ---------- Composing shapes ----------

const s = 46;
const H3 = (s * Math.sqrt(3)) / 2;
const hexagon = regular(6, 0, 0, s, 0).map(([x, y]) => [x + s, y + H3]);
const COMPOSE = {
  'مثلث|شكل سداسي': { part: [[0, H3], [s, H3], [s / 2, 0]], whole: hexagon },
  'شبه منحرف|شكل سداسي': { part: [[s / 2, 0], [1.5 * s, 0], [2 * s, H3], [0, H3]], whole: hexagon },
  'مثلث|شبه منحرف': { part: [[0, H3], [s, H3], [s / 2, 0]], whole: [[s / 2, 0], [1.5 * s, 0], [2 * s, H3], [0, H3]] },
  'مربع صغير|مستطيل من صفين وعمودين': { part: [[0, 0], [s, 0], [s, s], [0, s]], whole: [[0, 0], [2 * s, 0], [2 * s, 2 * s], [0, 2 * s]] },
  'مربع|مستطيل طوله ضعف عرضه': { part: [[0, 0], [s, 0], [s, s], [0, s]], whole: [[0, 0], [2 * s, 0], [2 * s, s], [0, s]] },
  'مثلث|مربع (بقطع المربع من قطره)': { part: [[0, 0], [1.4 * s, 1.4 * s], [0, 1.4 * s]], whole: [[0, 0], [1.4 * s, 0], [1.4 * s, 1.4 * s], [0, 1.4 * s]] },
};

export function ComposeShapes({ part, whole }) {
  const c = COMPOSE[`${part}|${whole}`];
  if (!c) return null;
  const box = (pts) => {
    const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]);
    return [Math.min(...xs), Math.min(...ys), Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys)];
  };
  const [px, py, pw, ph] = box(c.part);
  const [wx, wy, ww, wh] = box(c.whole);
  const gap = 56, pad = 8, H = Math.max(ph, wh) + pad * 2;
  const W = ww + gap + pw + pad * 2;
  // Part on the right (read first), the whole on the left, an arrow between.
  const partX = W - pad - pw - px, partY = (H - ph) / 2 - py;
  const wholeX = pad - wx, wholeY = (H - wh) / 2 - wy;
  const move = (pts, dx, dy) => poly(pts.map(([x, y]) => [x + dx, y + dy]));
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width={Math.min(320, W)} direction="ltr" class="compose" role="img">
      <polygon points={move(c.part, partX, partY)} class="shape" />
      <path d={`M${pad + ww + gap - 12},${H / 2} H${pad + ww + 12} m8,-7 l-8,7 l8,7`} class="compose-arrow" />
      <polygon points={move(c.whole, wholeX, wholeY)} class="compose-whole" />
      <text x={pad + ww / 2} y={H / 2 + 10} text-anchor="middle" class="compose-q">؟</text>
    </svg>
  );
}

// ---------- Perimeter: polygon with side lengths ----------

export function Polygon({ shape, sides }) {
  let pts;
  if (shape === 'square') pts = [[30, 20], [150, 20], [150, 140], [30, 140]];
  else if (shape === 'rectangle') {
    const [a, b] = [Math.max(sides[0], sides[1]), Math.min(sides[0], sides[1])];
    const h = Math.max(50, Math.min(120, (140 * b) / a));
    pts = [[20, 80 - h / 2], [160, 80 - h / 2], [160, 80 + h / 2], [20, 80 + h / 2]];
    sides = [a, b, a, b];
  } else if (shape === 'triangle') pts = [[90, 16], [164, 140], [16, 140]];
  else pts = regular(sides.length, 90, 82, 66);
  const cx = pts.reduce((t, p) => t + p[0], 0) / pts.length;
  const cy = pts.reduce((t, p) => t + p[1], 0) / pts.length;
  return (
    <svg viewBox="-30 -14 240 186" width="250" direction="ltr" class="perimeter" role="img">
      <polygon points={poly(pts)} class="shape" />
      {pts.map((p, i) => {
        const q = pts[(i + 1) % pts.length];
        const mx = (p[0] + q[0]) / 2, my = (p[1] + q[1]) / 2;
        const d = Math.hypot(mx - cx, my - cy) || 1;
        return (
          <text key={i} x={mx + ((mx - cx) / d) * 20} y={my + ((my - cy) / d) * 18 + 5} text-anchor="middle" direction="rtl" class="side-label">
            {ar(sides[i])} سم
          </text>
        );
      })}
    </svg>
  );
}

// ---------- Volume: a box of unit cubes (isometric) ----------

export function CubeStack({ length, width, height }) {
  const u = 24, cx = u * 0.866, cy = u * 0.5;
  const P = (x, y, z) => [(x - y) * cx, (x + y) * cy - z * u];
  const cubes = [];
  for (let i = 0; i < length; i++) for (let j = 0; j < width; j++) for (let k = 0; k < height; k++) cubes.push([i, j, k]);
  cubes.sort((a, b) => a[0] + a[1] - (b[0] + b[1]) || a[2] - b[2]);
  const minX = -width * cx, maxX = length * cx, minY = -height * u, maxY = (length + width) * cy;
  const pad = 4;
  return (
    <svg viewBox={`${minX - pad} ${minY - pad} ${maxX - minX + 2 * pad} ${maxY - minY + 2 * pad}`} width={Math.min(260, (maxX - minX + 2 * pad) * 1.4)} class="cubes" role="img">
      {cubes.map(([i, j, k]) => (
        <g key={`${i}-${j}-${k}`}>
          <polygon class="cube-top" points={poly([P(i, j, k + 1), P(i + 1, j, k + 1), P(i + 1, j + 1, k + 1), P(i, j + 1, k + 1)])} />
          <polygon class="cube-right" points={poly([P(i + 1, j, k), P(i + 1, j + 1, k), P(i + 1, j + 1, k + 1), P(i + 1, j, k + 1)])} />
          <polygon class="cube-left" points={poly([P(i, j + 1, k), P(i + 1, j + 1, k), P(i + 1, j + 1, k + 1), P(i, j + 1, k + 1)])} />
        </g>
      ))}
    </svg>
  );
}

// ---------- Square tables pushed together in a row ----------

export function TablesRow({ tables }) {
  const t = Math.min(44, 280 / tables);
  const W = tables * t + 8;
  return (
    <svg viewBox={`0 0 ${W} ${t + 8}`} width={W} class="tables-row" role="img">
      {Array.from({ length: tables }, (_, i) => <rect key={i} x={4 + i * t} y="4" width={t} height={t} rx="3" class="table-top" />)}
    </svg>
  );
}
