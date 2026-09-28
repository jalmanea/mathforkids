# Saudi math exercise engine: Phase 1

This is the content and logic layer for a math practice app. It targets **grade 2 and grade 3 of the Saudi national curriculum** (الصف الثاني والثالث الابتدائي), covering both semesters.

It has three parts:
- a machine-readable curriculum map ([curriculum/curriculum.json](curriculum/curriculum.json));
- one randomized generator per lesson;
- a data model for logging each attempt.

There is no UI, game logic or scoring here; those come in Phase 2.

```bash
npm test
```

```bash
npm run sample -- g2-s1-u5-l7 2 5
```

`npm test` runs every lesson × difficulty 50 times and checks the results. Set `N=1000` for a stress run. `npm run sample` prints five exercises for one lesson at one difficulty; run it with no arguments to get one exercise per lesson.

## Tech stack (and why)

- **Plain JavaScript ES modules, no dependencies, no build step.**
  - The same files run in Node (for tests) and in any modern browser, including iOS Safari.
  - The Phase 2 installable web app (PWA) can import `src/` directly and generate exercises offline on the device.
- **No backend, no accounts.**
  - There is one child on one device. Exercise generation is pure computation.
  - Performance logs go to **IndexedDB** on the device (Phase 2), plus a JSON export/import for backup or moving to a new phone.
  - A server would add hosting, auth and privacy concerns without adding anything for a single user.
- **Room for a second child.** Every log record carries `learner_id` (currently `"default"`). Adding a second child means adding a learner row and a picker, with no schema migration.
- **Moving to a server later:** if the logs ever need to sync across devices, the records are already flat JSON with stable IDs. They can be pushed as-is to any small store (SQLite, Supabase and so on).

## Layout

```
curriculum/curriculum.json   grade → semester → unit → lesson map; each lesson names its generator + difficulty params
curriculum/SOURCES.md        sources, verification status, answers to the open questions, flagged lessons
src/index.js                 public API: generateExercise, listLessons, loadCurriculum, logging helpers
src/registry.js              generator key → function (plus the `mix` generator)
src/core/digits.js           the ONLY Western→Arabic-Indic digit conversion (toArabicDigits / n)
src/core/arabic.js           names, gender agreement, number–noun agreement (تمييز العدد) with case
src/core/number-words.js     Arabic number words 0–99,999
src/core/choices.js          multiple-choice assembly and common-mistake helpers
src/core/exercise.js         the Exercise object (makeExercise)
src/core/random.js           seedable RNG
src/generators/*.js          generator families: numbers, addition, subtraction, multiplication,
                             division, fractions, measurement (money/time/length/area/…), geometry, data, word
src/logging/attempt-log.js   performance-log data model (pure functions)
test/                        validation suite + independent checkers
scripts/sample.js            print sample exercises
```

## Usage

```js
import { loadCurriculum, generateExercise, startAttempt, recordResponse } from './src/index.js';

const curriculum = await loadCurriculum();          // in the browser: fetch the JSON and pass it in
const ex = generateExercise(curriculum, 'g2-s1-u5-l7', 2);
// e.g. ex.prompt → "٣٨ + ٤٧ = ؟"   ex.answer → "٨٥"   ex.choices → ["٨٥", "٧٥", "٨٦", "٩٥"]
const same = generateExercise(curriculum, 'g2-s1-u5-l7', 2, { seed: ex.seed }); // same content, new exercise_id
```

## The exercise object

| field | meaning |
|---|---|
| `exercise_id` | UUID, new for every generated instance. Logs key on it. |
| `lesson_id`, `difficulty` | The lesson and tier it came from |
| `skill` | Machine tag for the specific sub-skill, e.g. `add.column.regroup`, `frac.compare.related`. Useful for the parent view. |
| `type` | One of `arithmetic`, `fill_blank`, `comparison`, `word_problem`, `pattern`, `ordering`, `visual`, `multiple_choice` |
| `prompt` | Arabic text with Arabic-Indic digits, in logical (reading) order |
| `answer` | The correct answer as displayed |
| `choices` | Shuffled options, with the answer exactly once. Numeric distractors model real mistakes: forgetting to regroup, place-value slips, off by one, the wrong operation. |
| `visual` | `null`, or a structured rendering hint. See "Visual kinds" below. |
| `data` | Machine-readable operands, with `answer_value` in plain JS numbers. Used for checking and analytics. |
| `seed` | `(lesson_id, difficulty, seed)` reproduces the content exactly |

### Rendering rules for Phase 2

- **RTL:** render everything inside `dir="rtl"`.
  - Prompts are stored in logical order, so "٤٥ + ٣٢ = ؟" displays right-to-left, as in Saudi textbooks.
  - The symbols `<` and `>` are mirrored by the bidi algorithm. Render prompts **and choice buttons** in RTL context so both mirror consistently; the open side then still faces the larger number.
- **Fractions:** the books write fractions stacked.
  - Fraction exercises set `data.display = 'fraction'` (or `'fraction_list'`) and carry `data.answer_value` / `data.choice_values` as `{num, den}`. Render these stacked.
  - The text fallback `٣/٤` is wrapped in LRI…PDI isolates (U+2066/U+2069) so numerator and denominator never swap inside RTL text.
- **Visual kinds:** `place_value_chart`, `object_cloud`, `money` (items have `form: coin|note`), `clock`, `ruler`, `grid_area`, `grid_shapes`, `polygon`, `cube_stack`, `solid`, `plane_shape`, `shape_sequence`, `compose_shapes`, `fraction_model`, `fraction_compare`, `fraction_list`, `set_model`, `equal_groups`, `array`, `tally_table`, `pictograph`, `bar_graph`, `bag`, `table`, `tables_row`.
  - Numeric fields are plain numbers. Any display text sits in `label`, `title`, `key_label` or `columns`, already in Arabic with Arabic-Indic digits.

## Curriculum schema

```jsonc
{
  "schema_version": 1,
  "grades": [{ "grade": 2, "title": "…", "semesters": [{ "semester": 1, "title": "…", "units": [{
    "id": "g2-s1-u5", "number": 5, "title": "جمع الأعداد المكونة من رقمين",
    "lessons": [{
      "id": "g2-s1-u5-l7",          // g{grade}-s{semester}-u{chapter}-{l|x|p|e}{n}; x = أستكشف, p = تدريبات, e = توسع
      "ref": "5-7",                  // textbook lesson number
      "type": "lesson",              // lesson | problem_solving | investigation | explore | practice | extension
      "title": "…", "objective": "…",   // Arabic, Arabic-Indic digits
      "generator": "add.column",     // default generator for all tiers
      "difficulties": {
        "1": { "params": { "a": [10, 60], "b": [10, 39], "regroup": "required", "max_sum": 99 } },
        "3": { "generator": "frac.order", "params": { … } }   // a tier may override the generator
      },
      "verified": { "source": "G2 part 1 p. 125", "note": "…" },   // present when checked against the page
      "flags": [{ "kind": "constraint_inferred", "note": "…" }]    // ambiguous / unverified / conflicting
    }]
  }]}]}]
}
```

- **IDs:** unit IDs use the textbook chapter number, which continues across semesters (grade 2 semester 2 starts at chapter 7). IDs are stable, so don't renumber them. If the ministry inserts a lesson, give it a new ID.
- **Mixed lessons:** investigation and practice lessons use the `mix` generator, `{ pool: [{ generator, params }, …] }`. The exercise records which pool entry was drawn in `data.mix_entry`.

## Adding a lesson

1. **Add the lesson entry** to `curriculum.json` in the right unit, following the schema above.
2. **Reuse a generator if one fits**, and express the lesson's limits purely through `params` (ranges, `regroup`, `tables`, `denominators`, …). Each generator documents its params in a JSDoc comment. A tier must never exceed what the book has taught by that lesson.
3. **Run `npm test`.** The suite checks every lesson automatically:
   - Arabic-only text with Arabic-Indic digits.
   - An independently verified answer, with no distractor that is also correct.
   - Values inside the declared constraints.
   - Real variety across runs.
4. **Look at the output** with `npm run sample -- <lesson-id> <difficulty> 10` and check the Arabic by eye.

## Adding a generator

1. **Write a function `(ctx) => Exercise`** in the right file under `src/generators/`, and export it under a namespaced key (`family.name`). `ctx` is `{ lesson, difficulty, params, rng }`.
   - Use `ctx.rng` for all randomness; never `Math.random`. Use `sampleUntil` to enforce constraints.
   - Build student text with `n()` from `core/digits.js` for **every** number, and `countNoun` / `v` from `core/arabic.js` for grammar. Never hand-write digit conversion.
   - Return the result through `numericMC` or `stringMC` (or `makeExercise`). Compute the answer from the generated operands.
   - Put the operands and `answer_value` in `data`.
2. **Register the family** in `src/registry.js` if it's a new file.
3. **Add a constraint check** for the generator key in `test/constraints.js`.
4. **Make sure the answer is independently checked.** Either:
   - the prompt contains a pure equation with `؟`, which is verified by substitution automatically; or
   - you add a checker for the skill in `test/checkers.js`.

   Checkers must not import generator code. The suite fails if any skill has no independent check.

## Performance logging (data model only in Phase 1)

`src/logging/attempt-log.js` defines `Learner`, `Session` and `AttemptLog`, with the pure helpers `startAttempt`, `recordResponse` and `finishAttempt`.

- **One AttemptLog per exercise shown.** Each record holds:
  - `exercise_id`, `learner_id`, `session_id`, `lesson_id`;
  - `unit_id`, `grade` and `semester`, copied in from the lesson;
  - `difficulty`, `skill` and the full `exercise` snapshot;
  - `shown_at` and `finished_at`;
  - `time_spent_ms`, the `responses[]` (value, correct, ms), `attempts`, `correct`, `first_try_correct` and `outcome`.
- **Typed answers are normalized,** so Western digits from a device keyboard still match.
- **Why it's denormalized:** the parent view's questions become single-table group-bys with no joins. Those questions include time per session, accuracy by lesson or unit, and trends by day. The exercise snapshot keeps history readable even if the curriculum or a generator changes later.

## Known limits

See [curriculum/SOURCES.md](curriculum/SOURCES.md) for flagged lessons and for what is deliberately not generated.
