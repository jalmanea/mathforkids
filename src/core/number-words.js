// Arabic number words (counting form, masculine), 0..99,999.
// Used by "read and write numbers" lessons.

const ONES = ['صفر', 'واحد', 'اثنان', 'ثلاثة', 'أربعة', 'خمسة', 'ستة', 'سبعة', 'ثمانية', 'تسعة'];
const TEENS = ['عشرة', 'أحد عشر', 'اثنا عشر', 'ثلاثة عشر', 'أربعة عشر', 'خمسة عشر', 'ستة عشر', 'سبعة عشر', 'ثمانية عشر', 'تسعة عشر'];
const TENS = ['', '', 'عشرون', 'ثلاثون', 'أربعون', 'خمسون', 'ستون', 'سبعون', 'ثمانون', 'تسعون'];
const HUNDREDS = ['', 'مئة', 'مئتان', 'ثلاثمئة', 'أربعمئة', 'خمسمئة', 'ستمئة', 'سبعمئة', 'ثمانمئة', 'تسعمئة'];

function below100(x) {
  if (x < 10) return ONES[x];
  if (x < 20) return TEENS[x - 10];
  const t = Math.floor(x / 10);
  const o = x % 10;
  return o === 0 ? TENS[t] : `${ONES[o]} و${TENS[t]}`;
}

function below1000(x) {
  const h = Math.floor(x / 100);
  const r = x % 100;
  if (h === 0) return below100(r);
  if (r === 0) return HUNDREDS[h];
  return `${HUNDREDS[h]} و${below100(r)}`;
}

function thousandsPart(k) {
  if (k === 1) return 'ألف';
  if (k === 2) return 'ألفان';
  if (k <= 10) return `${below100(k)} آلاف`;
  return `${below1000(k)} ألفًا`; // 11..99 -> accusative singular
}

/** @param {number} x integer 0..99999 */
export function numberToWords(x) {
  if (!Number.isInteger(x) || x < 0 || x > 99999) throw new Error(`numberToWords: out of range ${x}`);
  if (x < 1000) return below1000(x);
  const k = Math.floor(x / 1000);
  const r = x % 1000;
  return r === 0 ? thousandsPart(k) : `${thousandsPart(k)} و${below1000(r)}`;
}
