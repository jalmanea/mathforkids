// Read-aloud with the device's Arabic voice (speechSynthesis).
// Digits are spoken from Western digits (voices read them more reliably), the
// LRI…PDI bidi isolates are removed, and the math symbols get their words.

import { fromArabicDigits } from '../../src/index.js';

const ISOLATES = /[⁦-⁩‎‏]/g;
const SYMBOLS = [
  [/\s×\s/g, ' ضرب '],
  [/\s\+\s/g, ' زائد '],
  [/\s[−-]\s/g, ' ناقص '],
  [/\s=\s/g, ' يساوي '],
  [/\s÷\s/g, ' قسمة '],
  // A standalone ؟ is the blank to fill ("٨ × ؟ = ١٦", "٣٩٨، ؟، ١٩٨"); one attached to a word is a question mark.
  [/(^|\s)؟(?=\s|$|،)/g, '$1كم'],
  [/\s○\s/g, ' أيّ رمز '],
];

export function speakableText(text) {
  let s = fromArabicDigits(text).replace(ISOLATES, '');
  for (const [re, word] of SYMBOLS) s = s.replace(re, word);
  return s.replace(/\s+/g, ' ').trim();
}

let voice = null;

function pickVoice() {
  const voices = window.speechSynthesis?.getVoices() ?? [];
  voice = voices.find((v) => v.lang === 'ar-SA') ?? voices.find((v) => v.lang?.toLowerCase().startsWith('ar')) ?? null;
  return voice;
}

/** Resolves true when an Arabic voice exists. Voices load asynchronously on some browsers. */
export function hasArabicVoice() {
  if (!('speechSynthesis' in window)) return Promise.resolve(false);
  if (pickVoice()) return Promise.resolve(true);
  return new Promise((resolve) => {
    const done = () => resolve(Boolean(pickVoice()));
    window.speechSynthesis.addEventListener('voiceschanged', done, { once: true });
    setTimeout(done, 1500);
  });
}

export function speak(text) {
  if (!voice && !pickVoice()) return;
  const synth = window.speechSynthesis;
  synth.cancel();
  const u = new SpeechSynthesisUtterance(speakableText(text));
  u.voice = voice;
  u.lang = voice.lang;
  u.rate = 0.9;
  synth.speak(u);
}

export function stopSpeaking() {
  window.speechSynthesis?.cancel();
}
