import { test } from 'node:test';
import assert from 'node:assert/strict';
import { speakableText } from '../src/speech.js';

test('read-aloud text: Western digits, no bidi isolates, math words', () => {
  assert.equal(speakableText('٣٨ + ٤٧ = ؟'), '38 زائد 47 يساوي كم');
  assert.equal(speakableText('٨ × ؟ = ١٦'), '8 ضرب كم يساوي 16');
  assert.equal(speakableText('٨١ - ٢٩ = ؟'), '81 ناقص 29 يساوي كم');
  assert.equal(speakableText('اكتب ⁦٣/٤⁩ بالكلمات'), 'اكتب 3 على 4 بالكلمات');
  assert.equal(speakableText('ما العدد المفقود في النمط؟ ٤٩٨، ٣٩٨، ؟، ١٩٨'), 'ما العدد المفقود في النمط؟ 498، 398، كم، 198');
  assert.equal(speakableText('اختر الرمز المناسب: ٧٥٥٩٠ ○ ٧٥٥٥٠'), 'اختر الرمز المناسب: 75590 أيّ رمز 75550');
});
