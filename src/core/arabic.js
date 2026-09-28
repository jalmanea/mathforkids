// Arabic language helpers for word problems: names, verb/pronoun agreement,
// and number–noun agreement (تمييز العدد) when the number is written in digits.
import { n } from './digits.js';

export const NAMES = {
  m: ['محمد', 'عبدالله', 'فهد', 'خالد', 'سعد', 'عمر', 'يوسف', 'فيصل', 'سلمان', 'تركي', 'ناصر', 'أحمد'],
  f: ['سارة', 'نورة', 'ريم', 'لمى', 'جود', 'هيا', 'مريم', 'لين', 'رهف', 'دانة', 'شهد', 'ليان'],
};

/** A random child: { name, g } where g is 'm' | 'f'. */
export function person(rng, exclude = []) {
  const g = rng.pick(['m', 'f']);
  const pool = NAMES[g].filter((x) => !exclude.includes(x));
  return { name: rng.pick(pool), g };
}

/** Pick the masculine or feminine form: v(p, 'اشترى', 'اشترت'). */
export function v(p, masc, fem) {
  return p.g === 'f' ? fem : masc;
}

/**
 * A countable noun with its agreement forms.
 * @typedef {Object} Noun
 * @property {string} one    singular (nominative/genitive):  قلم
 * @property {string} two    dual:                             قلمان
 * @property {string} few    plural, used for 3–10:            أقلام
 * @property {string} many   singular accusative, for 11–99:   قلمًا
 * @property {'m'|'f'} g     grammatical gender, for "واحد/واحدة"
 * @property {string} [two_acc] irregular accusative/genitive dual (جزأين); otherwise derived from `two`
 */

/**
 * Number + noun with correct agreement, number in Arabic-Indic digits.
 * 1 -> "قلم واحد", 2 -> "قلمان", 3–10 -> "٣ أقلام", 11–99 -> "١٢ قلمًا",
 * x00 -> "١٠٠ قلم"; for >100 the last two digits decide.
 * Case matters only for 1 and 2 (digits hide it otherwise):
 *   nom: "قلم واحد" / "قلمان"   acc: "قلمًا واحدًا" / "قلمين"   gen: "قلم واحد" / "قلمين"
 * @param {number} count
 * @param {Noun} noun
 * @param {'nom'|'acc'|'gen'} [kase]  grammatical case of the phrase in the sentence
 */
export function countNoun(count, noun, kase = 'nom') {
  if (count === 1) {
    if (kase === 'acc') return `${noun.many} ${noun.g === 'f' ? 'واحدة' : 'واحدًا'}`;
    return `${noun.one} ${noun.g === 'f' ? 'واحدة' : 'واحد'}`;
  }
  if (count === 2) return kase === 'nom' ? noun.two : (noun.two_acc ?? noun.two.replace(/ان$/, 'ين'));
  const r = count % 100;
  if (count > 100 && (r === 1 || r === 2)) return `${n(count)} ${noun.one}`;
  if (r >= 3 && r <= 10) return `${n(count)} ${noun.few}`;
  if (r >= 11) return `${n(count)} ${noun.many}`;
  return `${n(count)} ${noun.one}`; // r === 0 (100, 200, ...)
}

/** Everyday countable things for word problems (Saudi context). */
export const NOUNS = {
  pencil: { one: 'قلم', two: 'قلمان', few: 'أقلام', many: 'قلمًا', g: 'm' },
  book: { one: 'كتاب', two: 'كتابان', few: 'كتب', many: 'كتابًا', g: 'm' },
  sticker: { one: 'ملصق', two: 'ملصقان', few: 'ملصقات', many: 'ملصقًا', g: 'm' },
  date: { one: 'تمرة', two: 'تمرتان', few: 'تمرات', many: 'تمرة', g: 'f' },
  ball: { one: 'كرة', two: 'كرتان', few: 'كرات', many: 'كرة', g: 'f' },
  flower: { one: 'وردة', two: 'وردتان', few: 'ورود', many: 'وردة', g: 'f' },
  apple: { one: 'تفاحة', two: 'تفاحتان', few: 'تفاحات', many: 'تفاحة', g: 'f' },
  card: { one: 'بطاقة', two: 'بطاقتان', few: 'بطاقات', many: 'بطاقة', g: 'f' },
  bird: { one: 'طائر', two: 'طائران', few: 'طيور', many: 'طائرًا', g: 'm' },
  car: { one: 'سيارة', two: 'سيارتان', few: 'سيارات', many: 'سيارة', g: 'f' },
  shell: { one: 'صدفة', two: 'صدفتان', few: 'صدفات', many: 'صدفة', g: 'f' },
  marble: { one: 'بلية', two: 'بليتان', few: 'بليات', many: 'بلية', g: 'f' },
  riyal: { one: 'ريال', two: 'ريالان', few: 'ريالات', many: 'ريالًا', g: 'm' },
  halala: { one: 'هللة', two: 'هللتان', few: 'هللات', many: 'هللة', g: 'f' },
  student: { one: 'طالب', two: 'طالبان', few: 'طلاب', many: 'طالبًا', g: 'm' },
  page: { one: 'صفحة', two: 'صفحتان', few: 'صفحات', many: 'صفحة', g: 'f' },
  minute: { one: 'دقيقة', two: 'دقيقتان', few: 'دقائق', many: 'دقيقة', g: 'f' },
  box: { one: 'صندوق', two: 'صندوقان', few: 'صناديق', many: 'صندوقًا', g: 'm' },
  bag: { one: 'كيس', two: 'كيسان', few: 'أكياس', many: 'كيسًا', g: 'm' },
  plate: { one: 'طبق', two: 'طبقان', few: 'أطباق', many: 'طبقًا', g: 'm' },
  row: { one: 'صف', two: 'صفان', few: 'صفوف', many: 'صفًا', g: 'm' },
};

/** Nouns suitable for "how many things" problems (excludes units like riyal/minute/row/box). */
export const THING_KEYS = ['pencil', 'book', 'sticker', 'date', 'ball', 'flower', 'apple', 'card', 'shell', 'marble', 'car'];
