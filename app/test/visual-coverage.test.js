import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { loadCurriculum, listLessons, difficultiesOf, generateExercise } from '../../src/index.js';

// The renderer registry is JSX, so read its keys from the source instead of importing it.
async function registeredKinds() {
  const src = await readFile(new URL('../src/visuals/index.jsx', import.meta.url), 'utf8');
  const body = src.match(/export const RENDERERS = \{([\s\S]*?)\};/)[1];
  return new Set([...body.matchAll(/^\s*(\w+):/gm)].map((m) => m[1]));
}

test('every visual kind the engine produces has a renderer (so no lesson is hidden)', async () => {
  const kinds = await registeredKinds();
  const missing = new Map();
  for (const subject of ['math', 'science']) {
    const curriculum = await loadCurriculum(subject);
    for (const lesson of listLessons(curriculum)) {
      for (const d of difficultiesOf(lesson)) {
        for (let seed = 1; seed <= 30; seed++) {
          const kind = generateExercise(curriculum, lesson.id, d, { seed }).visual?.kind;
          if (kind && !kinds.has(kind)) missing.set(kind, lesson.id);
        }
      }
    }
  }
  assert.deepEqual([...missing], [], 'visual kinds without a renderer (kind, first lesson)');
});
