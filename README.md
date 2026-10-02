# Saudi math and science practice: exercise engine and app

A practice app for **math and science in grade 2 and grade 3 of the Saudi national curriculum** (الصف الثاني والثالث الابتدائي).

- **Phase 1, the engine (`src/`, `curriculum/`):**
  - a machine-readable curriculum map ([curriculum/curriculum.json](curriculum/curriculum.json)), both semesters of both grades;
  - one randomized generator per lesson;
  - a data model for logging each attempt.
  - **Science** ([curriculum/science.json](curriculum/science.json)) uses the same map, but each lesson carries a written question bank instead of number ranges. See [Science](#science) below.
- **Phase 2, the app (`app/`):** an Arabic, RTL web app. It installs to the iPhone home screen, works offline, and adds points, streaks, levels and a parent view. See [The practice app](#the-practice-app-phase-2) below.

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
curriculum/science.json      the same map for science (العلوم); each lesson holds its question bank in `content`
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
                             division, fractions, measurement (money/time/length/area/…), geometry, data, word,
                             science (one generator, `sci.quiz`, driven by the lesson's content)
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

## Science

Science has 49 lessons: 24 in grade 2 and 25 in grade 3, in chapters 1–6 (semester 1) and 7–12 (semester 2) of each grade.

- **Loading:** `loadCurriculum('science')`. Lesson ids start with `sci-` (e.g. `sci-g3-s1-u2-l1`), so they never collide with math ids and can share the same logs and progress tables.
- **One generator, `sci.quiz`.** A science answer can't be computed, so each lesson has a `content` bank and the generator varies what it asks from it:

  | In `content` | Shape | Questions it produces |
  |---|---|---|
  | `terms` | `{ term, def }` | the definition is shown, choose the word; from tier 2, the word is shown, choose the definition |
  | `groups` | `{ which?, categories: [{ name, pick, members }] }` | `pick` asks for a member of one category; `which` (with `{x}`) asks which category a member belongs to |
  | `sequences` | `{ name, steps }` | what comes first, and what comes after a step |
  | `questions` | `{ q, a, wrong, level? }` | the written question, with three of its wrong options |

- **Tiers:** every lesson has tiers 1 and 2 (`params.level`). Tier 2 adds word-to-definition questions and the written questions marked `level: 2`. Answers are words, so science is always multiple choice.
- **Checks:** `test/science.test.js` validates the bank itself: Arabic only, no option that is also correct, nothing sorted into two categories, no definition that contains its own word, and at least 8 things to ask at each tier. The generated exercises go through the same suite as math, with checkers that read the bank straight from the JSON.
- **Adding or fixing a question:** edit the lesson's `content` in `science.json` and run `npm test`. No code changes are needed.
- **The content is not yet checked against the book pages.** See [curriculum/SOURCES.md](curriculum/SOURCES.md#science).

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

## The practice app (Phase 2)

```bash
npm install
```

```bash
npm run dev
```

```bash
npm run build
```

- **`npm run dev`** serves the app at http://localhost:5173.
- **`npm run build`** writes the installable, offline build to `dist/`. Preview it with `npm run preview`.
- **`npm test`** runs the engine suite plus the app's game-logic tests (`app/test/`).
- **Deploy:** pushing to `main` runs [.github/workflows/deploy.yml](.github/workflows/deploy.yml). It tests, builds with `BASE_PATH=/<repo-name>/`, and publishes to GitHub Pages.

### Stack

- **Libraries:** Vite, Preact, `vite-plugin-pwa` (a Workbox service worker that precaches everything) and Dexie (IndexedDB). They are all dependencies of the root `package.json`; the engine in `src/` stays dependency-free.
- **Engine import:** the app imports the engine from `../src/index.js` unchanged. `curriculum.json` and `science.json` are bundled into the JavaScript, so it works offline.
- **Font:** Tajawal, self-hosted in `app/public/fonts/` (SIL OFL, licence alongside).
- **Icons:** drawn by `npm run icons` (`app/scripts/make-icons.js`), which needs no image library.

### Layout

```
app/index.html, vite.config.js   entry + build/PWA config (manifest: Arabic name, dir rtl, standalone)
app/src/main.jsx                 app root: state, derived totals, celebrations, navigation
app/src/screens/                 Home, LessonMap, Practice, Summary, Parent (PIN, report, settings, backup)
app/src/visuals/                 a renderer for every visual.kind the engine produces:
  data.jsx                         object_cloud, tally_table, pictograph, bar_graph, table, bag
  fractions.jsx                    fraction_model, fraction_compare, fraction_list, set_model; MathText (stacked fractions in text)
  measure.jsx                      money, clock, ruler, grid_area, grid_shapes
  geometry.jsx                     plane_shape, solid, shape_sequence, compose_shapes, polygon, cube_stack, tables_row
  PlaceValueChart, ArrayGrid, EqualGroups
app/src/game/                    pure game logic (tested in app/test/):
  points.js                        10 / 5 / 2 by try, +10 every 5 first-try correct in a row
  streak.js, days.js               daily goal (default 20), streak with one free missed day per 7, local-time days
  progress.js                      per-lesson stars (top-step first-try accuracy), player level from points
  adaptive.js                      tier ladder: choice below the top tier, keypad at the top; 5 in a row up, 3 of 5 missed down
  session.js                       ~80% chosen lesson, ~20% review of earlier lessons weighted by weak skills
  stats.js                         parent-view aggregations
  interaction.js                   interactive answers: which exercises get one, and how a construction is checked
app/src/interactions.jsx         touch UI for interactive answers (drag to order, clock hands, pay, symmetry lines, shade)
app/src/db.js                    Dexie tables: learners, sessions, attempts, progress, settings; backup/restore/reset
app/src/speech.js                read-aloud (speechSynthesis, Arabic voice; hidden if the device has none)
app/src/sound.js                 synthesized sound effects per theme (no audio files)
app/src/theme.css                tokens per theme: neutral, and "stitch" (colours and shapes only, no character art)
```

### Behaviour notes

- **Fractions:** prompts, choices and revealed answers render every isolated fraction stacked (`MathText`); read-aloud says "٣ على ٤".
- **Visuals never give the answer away:** data pictures don't print the values asked about, a "part of a set" question shows the equal groups uncoloured, the missing shape in a pattern is a "؟" box, and composing shapes shows the whole as an undivided outline.
- **Choosing a subject:** the الرياضيات / العلوم switch is on the home screen and the lesson map (and in the parent settings). Points, the level, the streak and the daily goal are shared between the two subjects.
- **Choosing a term:** the child picks the grade and semester at the top of the lesson map (e.g. to revise grade 2). The home screen's "continue" remembers the last chosen lesson per subject and term. Stars, points and the streak are shared across terms.
- **Lessons shown:** a lesson appears on the map only if the app can render everything it generates. `curriculum.js` samples each tier and checks every `visual.kind` against the renderer registry. Every grade 2 and grade 3 lesson (194 math, 49 science) is playable.
- **Answering:**
  - A child gets 3 tries. A wrong choice is greyed out, and after the third miss the answer is shown.
  - Every response goes through `recordResponse`. The attempt row is written as soon as the exercise is shown, updated on each response, and closed as `correct`, `gave_up` or (on leaving mid-exercise) `skipped`.
- **Interactive answers (top step only):** some exercises are turned around so the child builds the answer. The engine's exercise is reused; only the prompt changes, and the construction is converted to a value in the same format as `answer`, so logging and checking are unchanged. The logged exercise carries the new prompt and `data.interaction`.

  | Interaction | Exercises | Share at the top step |
  |---|---|---|
  | Drag rows into order | ordering numbers and fractions | all |
  | Move the clock hands to a time | reading the clock | about 70% |
  | Tap notes and coins to pay an amount | counting money | about 50% (the rest use the keypad) |
  | Tap every line of symmetry | counting axes of symmetry | about 70% |
  | Colour parts to show a fraction | naming the shaded fraction | about 70% |

  After three misses the solution is shown on the same picture.
- **Keypad tier:** single-tier lessons get two steps (choice, then keypad), so a child never starts on the keypad. The keypad is used only when the answer is a plain number; comparisons, orderings and yes/no answers stay multiple choice.
- **Session length:** equals the daily goal (5–30).
- **Data stays on the phone:**
  - "حفظ نسخة احتياطية" exports every table as JSON. On iOS this goes through the share sheet, e.g. Save to Files.
  - A restore replaces everything, including the parent PIN, with the backup's contents.
- **Parent PIN:** a child lock, not security.
