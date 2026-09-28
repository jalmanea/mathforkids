// The single place where numbers become student-facing text.
// Every generator must format numbers through these helpers — never by hand.

const WESTERN = '0123456789';
const ARABIC_INDIC = '٠١٢٣٤٥٦٧٨٩';

/** Arabic decimal separator (U+066B), used instead of "." in student-facing text. */
export const ARABIC_DECIMAL_SEPARATOR = '٫';

/**
 * Convert every Western digit in a string (or a number) to Arabic-Indic.
 * Non-digit characters are left untouched, so it is safe on whole sentences.
 * @param {string|number} value
 * @returns {string}
 */
export function toArabicDigits(value) {
  let s = String(value);
  if (typeof value === 'number') s = s.replace('.', ARABIC_DECIMAL_SEPARATOR);
  return s.replace(/[0-9]/g, (d) => ARABIC_INDIC[WESTERN.indexOf(d)]);
}

/**
 * Inverse of toArabicDigits, for parsing an answer typed by the child.
 * @param {string} value
 * @returns {string}
 */
export function fromArabicDigits(value) {
  return String(value)
    .replace(/[٠-٩]/g, (d) => WESTERN[ARABIC_INDIC.indexOf(d)])
    .replace(ARABIC_DECIMAL_SEPARATOR, '.');
}

/** Shorthand used by generators: format a number for display. */
export const n = toArabicDigits;

/** True if the string contains any Western (ASCII) digit. */
export function hasWesternDigits(s) {
  return /[0-9]/.test(s);
}

/** True if the string contains any Latin letter (i.e. English leaked into student-facing text). */
export function hasLatinLetters(s) {
  return /[A-Za-z]/.test(s);
}
