// Draws the app icons (PNG) with no image library: shapes are signed-distance
// functions, supersampled 4×4 per pixel, encoded with node:zlib.
//   node app/scripts/make-icons.js
import { deflateSync } from 'node:zlib';
import { writeFileSync, mkdirSync } from 'node:fs';

const OUT = new URL('../public/icons/', import.meta.url);
mkdirSync(OUT, { recursive: true });

const BLUE = [47, 93, 158];
const WHITE = [255, 255, 255];
const GOLD = [242, 179, 61];

// Signed distance helpers in unit space (0..1).
const box = (px, py, cx, cy, hw, hh, r = 0) => {
  const dx = Math.abs(px - cx) - hw + r;
  const dy = Math.abs(py - cy) - hh + r;
  return Math.hypot(Math.max(dx, 0), Math.max(dy, 0)) + Math.min(Math.max(dx, dy), 0) - r;
};
const rot = (px, py, cx, cy, a) => {
  const c = Math.cos(a), s = Math.sin(a), x = px - cx, y = py - cy;
  return [cx + x * c - y * s, cy + x * s + y * c];
};
const star = (px, py, cx, cy, R) => {
  // 5-point star as a polygon inside-test (returns -1 inside, 1 outside).
  const pts = [];
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const rr = i % 2 ? R * 0.45 : R;
    pts.push([cx + rr * Math.cos(a), cy + rr * Math.sin(a)]);
  }
  let inside = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const [xi, yi] = pts[i], [xj, yj] = pts[j];
    if (yi > py !== yj > py && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside ? -1 : 1;
};

/** Colour at a point: plus and times signs with a gold star, on blue. */
function shade(x, y, { maskable, rounded }) {
  const s = maskable ? 0.78 : 1; // keep the symbols inside the maskable safe zone
  const u = 0.5 + (x - 0.5) / s, v = 0.5 + (y - 0.5) / s;
  if (rounded && box(x, y, 0.5, 0.5, 0.5, 0.5, 0.2) > 0) return null;
  // plus (top-right in the picture), times (bottom-left)
  const plus = Math.min(box(u, v, 0.66, 0.36, 0.17, 0.05, 0.03), box(u, v, 0.66, 0.36, 0.05, 0.17, 0.03));
  const [tu, tv] = rot(u, v, 0.34, 0.66, Math.PI / 4);
  const times = Math.min(box(tu, tv, 0.34, 0.66, 0.16, 0.05, 0.03), box(tu, tv, 0.34, 0.66, 0.05, 0.16, 0.03));
  if (plus < 0 || times < 0) return WHITE;
  if (star(u, v, 0.3, 0.3, 0.13) < 0 || star(u, v, 0.7, 0.72, 0.09) < 0) return GOLD;
  return BLUE;
}

function render(size, opts) {
  const SS = 4;
  const px = Buffer.alloc(size * size * 4);
  for (let j = 0; j < size; j++) {
    for (let i = 0; i < size; i++) {
      let r = 0, g = 0, b = 0, a = 0;
      for (let sj = 0; sj < SS; sj++) {
        for (let si = 0; si < SS; si++) {
          const c = shade((i + (si + 0.5) / SS) / size, (j + (sj + 0.5) / SS) / size, opts);
          if (!c) continue;
          r += c[0]; g += c[1]; b += c[2]; a += 1;
        }
      }
      const o = (j * size + i) * 4;
      const n = SS * SS;
      px[o] = a ? r / a : 0; px[o + 1] = a ? g / a : 0; px[o + 2] = a ? b / a : 0; px[o + 3] = (255 * a) / n;
    }
  }
  return png(size, size, px);
}

function png(w, h, rgba) {
  const raw = Buffer.alloc((w * 4 + 1) * h);
  for (let y = 0; y < h; y++) rgba.copy(raw, y * (w * 4 + 1) + 1, y * w * 4, (y + 1) * w * 4);
  const chunk = (type, data) => {
    const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
    const td = Buffer.concat([Buffer.from(type), data]);
    const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td));
    return Buffer.concat([len, td, crc]);
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8; ihdr[9] = 6; // 8-bit RGBA
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw, { level: 9 })), chunk('IEND', Buffer.alloc(0))]);
}

const CRC = Array.from({ length: 256 }, (_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0; });
function crc32(buf) { let c = 0xffffffff; for (const b of buf) c = CRC[(c ^ b) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; }

const files = [
  ['icon-192.png', 192, { rounded: true }],
  ['icon-512.png', 512, { rounded: true }],
  ['icon-maskable-512.png', 512, { maskable: true }],
  ['apple-touch-icon.png', 180, {}], // iOS rounds the corners itself; must be opaque
];
for (const [name, size, opts] of files) {
  writeFileSync(new URL(name, OUT), render(size, opts));
  console.log('wrote', name);
}
