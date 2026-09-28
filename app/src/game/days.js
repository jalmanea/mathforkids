// Calendar days in the device's local timezone (pure).
// A day key is "YYYY-MM-DD" of the local date. Stepping uses the Date
// constructor with a day offset, so DST changes never skip or repeat a day.

const pad = (n) => String(n).padStart(2, '0');

/** Local day key of a Date, ISO string or epoch ms. */
export function dayKey(when) {
  const d = when instanceof Date ? when : new Date(when);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Local midnight Date of a day key. */
export function dayStart(key) {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
}

/** Day key shifted by `delta` days. */
export function addDays(key, delta) {
  const d = dayStart(key);
  return dayKey(new Date(d.getFullYear(), d.getMonth(), d.getDate() + delta));
}

/** The last `count` day keys ending with `endKey`, oldest first. */
export function lastDays(endKey, count) {
  return Array.from({ length: count }, (_, i) => addDays(endKey, i - count + 1));
}
