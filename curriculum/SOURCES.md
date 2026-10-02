# Curriculum sources and verification

This file records where `curriculum.json` (math) and `science.json` came from, how much of each was checked against the books, and what is still uncertain. Math comes first; [science](#science) is at the end.

## Edition and semester structure

- In 1447 AH (2025/26), Saudi Arabia went back from three semesters to **two semesters**. The textbooks were rebound into **two parts per grade**. Chapter numbering and lesson content did not change from the old three-part books.
- **Grade 2:**
  - Part 1 has chapters 1–6. It carries legal deposit number 1446/15283 and ISBN 978-603-8527-27-6, and has been used since 1447.
  - Part 2 has chapters 7–13, from the 1447 print.
- **Grade 3:**
  - Part 1 has chapters 1–5, from the 1448 print (2026).
  - Part 2 has chapters 6–11, from the 1447 print. A 1448 print of part 2 wasn't available yet (it isn't due until semester 2), and nothing suggests it will differ.
- **Stale listings:** some websites still show the old three-part split. For example, several "ف2 1447" pages list grade 2 chapters 5–8. **Don't trust pacing plans (توزيع) that list those chapters under semester 2.**

## Sources

| What | Source | Notes |
|---|---|---|
| G3 part 1 PDF (official file `1448-GE-PE-K03-SM1-math-part1.pdf`) | mirror: haqibati.net (`/wp-content/uploads/2026/08/…`) | Official host iencontent.ien.edu.sa returned HTTP 500; same filename linked from salisedu.com and wajibati.net |
| G3 part 2 PDF (1447) | mirror: mnhaji.com (`/wp-content/uploads/2026/01/كتاب-الرياضيات-ثالث-ابتدائي-ف2-1447-…`) | |
| G2 part 1 PDF | mirror: hisatii.com (`/wp-content/uploads/2025/08/riadiaat-thani-fi1.pdf`) | Official file `1448-GE-PE-K02-SM1-math.pdf` (ien returned 500) |
| G2 part 2 PDF (1447) | mirror: mnhaji.com (`/wp-content/uploads/2026/01/كتاب-الرياضيات-ثاني-ابتدائي-ف2-1447-…`); ajabatkum.com | |
| Tables of contents (cross-checks) | mnhaji.com, haqibati.net, wajibati.net, kottby.net, ifahem.com, salisedu.com, madty.net, beadaya.com | Used to confirm lesson lists and numbering |

- **Official platforms:** moe.gov.sa and ien.edu.sa (عين) could not be used. They are JavaScript apps, and direct PDF requests failed. Madrasati (مدرستي) needs a login.
- **Fallback used:** third-party sites that host the **official MoE PDFs**. The official file names and legal-deposit numbers match. The pages were rendered as images and read directly.

## Verification levels in `curriculum.json`

- **Lesson titles and order (all 194 lessons):**
  - Grade 3: read from the فهرس in the official PDFs.
  - Grade 2: confirmed by at least two independent listings, and by the PDF's lesson counts per chapter.
- **`verified` (34 lessons):** the constraints were checked against the lesson pages themselves. The field records book pages and a short note.
- **Unmarked lessons:** constraints are inferred from the lesson title, its position in the sequence, and neighbouring verified lessons.
  - Example: "5-6 add 1-digit to 2-digit with regrouping" means regrouping is required and the sum is at most 100.
  - These are conservative: they never go beyond what the chapter has already taught.
- **`flags` (14 lessons):** something is ambiguous, not verified, or conflicting between sources. Listed below.

## Answers to the open questions

1. **Multiplication is taught in grade 3, not grade 2.** There is no multiplication chapter in grade 2. The nearest topic is the doubles strategy (2-4, 2-5, 3-3).
   - Grade 3 semester 1, chapter 4 teaches the meaning of multiplication, arrays, then ×2, ×4, ×5, ×10, then ×0 and ×1.
   - Chapter 5 teaches ×3, ×6, ×7, ×8, ×9 and the associative property. Facts go up to ×10; there is no ×11 or ×12.
   - Division is in grade 3 semester 2 (chapters 6–7).
2. **Fractions are taught in both grades.**
   - Grade 2 semester 2, chapter 8:
     - Covers unit fractions, fractions with more than one part, fractions equal to 1, and comparing **unit fractions only**.
     - Uses area models, with a set model in 8-6. Denominators go up to 12.
     - The book says «العدد العلوي/السفلي», not البسط/المقام.
   - Grade 3 semester 2, chapter 11:
     - Introduces البسط/المقام, parts of a set, and equivalent fractions (strips, up to twelfths).
     - Compares fractions with the same or related denominators, and orders sets of three.
3. **Semester structure:** two semesters, and the map covers both semesters of both grades.
4. **Source access:** the official platforms were not usable (see above). The fallback is mirrors of the official PDFs, and no curriculum content was invented.

## Other facts verified on the pages

- **Money:** grade 2 uses riyals only. The 1 and 2 riyal are coins; 5, 10, 50 and 100 are notes. There is no هللة in grade 2.
- **Time:**
  - Grade 2 uses words first («الساعة الثالثة», «والنصف», «والربع», «إلا الربع»), then digital h:mm from 7-8. Lesson 7-10 goes to the nearest 5 minutes.
  - Grade 3 (8-8) reads time to the nearest minute.
- **Geometry terms:**
  - Grade 2 solids: كرة، مكعب، هرم، مخروط، أسطوانة، متوازي مستطيلات. Plane shapes are counted by أضلاع و رؤوس, and a circle has ٠.
  - Grade 3 solids use هرم رباعي. Plane shapes use شكل رباعي/خماسي/سداسي/ثماني, counted by **أضلاع و زوايا**.
  - Symmetry (9-6) asks yes/no, then how many axes.
- **Probability:**
  - Grade 2: أكيد / مستحيل (4-7), and أكثر إمكانية / أقل إمكانية (4-8).
  - Grade 3 (10-6): أكيد، أكثر احتمالًا، أقل احتمالًا، مستحيل. The word ممكن is not used.
- **Measurement (grade 3):**
  - Abbreviations: ملم، سم، م، كم؛ مل، ل؛ جم، كجم.
  - Lessons focus on choosing the unit or a reasonable estimate. The conversion facts (١ ل = ١٠٠٠ مل، ١ كجم = ١٠٠٠ جم، ١ م = ١٠٠ سم) appear only in boxes or margins, so conversions are not drilled.
- **Area:**
  - Grade 2 counts unit squares, with no half squares.
  - Grade 3 includes half squares.
- **Ranges:**
  - Grade 2 semester 1 sums stay at or below 100.
  - Grade 3 adds up to 3-digit numbers, and sums may pass 1000 (e.g. ٧٣١ + ٣١٣).
  - Grade 3 subtraction uses 3-digit numbers only.
- **Named properties (grade 3, 2-1):** خاصية الإبدال، خاصية العنصر المحايد، خاصية التجميع.

## Flagged lessons (see `flags` in the JSON)

| Lesson | Kind | Issue |
|---|---|---|
| g2-s1-u1-l9 | constraint_inferred | Difficulty 3 uses hundred-chart diagonals (+9/+11) |
| g2-s1-u2-l1 | constraint_inferred | Which addition properties grade 2 names |
| g2-s1-u3-l7 | source_conflict | الحقائق المترابطة vs المرتبطة (spelling) |
| g2-s1-u5-l7 | source_conflict | One listing omits the lesson; PDF lesson count includes it |
| g2-s2-u9-l4 | source_conflict | القيمة vs القيم المنزلية (spelling) |
| g2-s2-u10-l2 | ambiguous_skill | Counts for curved solids exist in the book but weren't read; only polyhedra asked |
| g2-s2-u10-l6 | ambiguous_skill | Comparison criterion; generator compares number of sides |
| g2-s2-u10-l7 | constraint_inferred | Pattern-block compositions assumed |
| g2-s2-u12-l2 | ambiguous_skill | Context of the "model it" problems |
| g2-s2-u13-l5 | constraint_inferred | Nearest 10 vs 100 when estimating 3-digit sums |
| g3-s1-u3-l6 | ambiguous_skill | Not labelled as problem-solving in the فهرس |
| g3-s1-u4-l4 | ambiguous_skill | Only "extra information" generated, not "missing information" |
| g3-s2-u10-e1 | not_generatable | Spreadsheet activity; reuses bar-graph reading |
| g3-s2-u11-l2 | constraint_inferred | "Find the part of a set" at difficulty 2 not confirmed |

## Not generated (by design)

- Elapsed time: grade 3 has one light item on p. 107. There is no lesson on it.
- Unit-conversion drills: the book states the conversions but doesn't drill them.
- Drawing tasks: draw the axes of symmetry, complete a symmetric figure, build a graph. These need interactive UI (Phase 2). The generators produce the reading and counting versions instead.

## Science

`science.json` covers العلوم for grades 2 and 3, in the same two-semester edition.

### Structure

- **Both grades:** part 1 has units 1–3 (chapters 1–6); part 2 has units 4–6 (chapters 7–12). Each chapter has two lessons, except grade 3 chapter 12, which has three.
- **In the JSON, a "unit" is a textbook chapter (الفصل),** as in math. The textbook unit (الوحدة) is kept in `book_unit`.
- **Grade 3 unit 6 changed in the current edition.** It is now الشغل والطاقة (الشغل، الآلات البسيطة، الصوت، الضوء، الكهرباء). Listings from 1442–1446 still show القوى والطاقة with الموقع والحركة and القوى. **Don't trust those.**

### Sources

| What | Source | Notes |
|---|---|---|
| Unit, chapter and lesson titles | mnhaji.com, wajibati.net, sahl.io, beadaya.com | Each title appears in two or three of these |
| Lesson vocabulary and facts | sahl.io lesson pages | They mirror the book's headings and vocabulary |
| Cross-checks | hulul.online, mnhaji.com chapter pages | Mostly grade 3 |

- **No PDF was read.** Unlike math, nothing was checked against the book pages. The official file names were not found; only renamed third-party mirrors turned up.
- **Pages were read through a summarizer,** so definitions are close to the book's wording, not guaranteed to match it.

### Verification levels (`source.confidence` on each lesson)

- **Titles and order (all 49 lessons):** confirmed by at least two listings.
- **`two_sources` (21 lessons):** vocabulary and facts found in two independent places. 19 are in grade 3; chapters 5–8 match the book's glossary text.
- **`single_source` (28 lessons):** taken from one lesson summary. This is 22 of grade 2's 24 lessons.
- **Which lesson a word belongs to** is partly inferred, because the source lists vocabulary per chapter.

### What was left out on purpose

These appeared in summaries but could not be confirmed as book text, so no question uses them:

- Moon counts and orbit times of the planets, and gestation lengths.
- "١١٨ عنصرًا", and the formula الشغل = القوة × المسافة.
- Names of the parts of the eye, أغلفة الأرض in grade 2, and the Earth as a magnet.
- Wind speeds of hurricanes, and example cities for climate other than الرياض.
- Semi-transparent objects are in the book but not asked, because everyday examples are easy to argue about.

### Flagged science lessons (see `flags` in the JSON)

| Lesson | Kind | Issue |
|---|---|---|
| sci-g2-s1-u2-l1 | constraint_inferred | Book wording for الزواحف، البرمائيات، الأسماك، الحشرات not captured; asked only by sorting well-known animals |
| sci-g2-s1-u3-l2 | constraint_inferred | Organisms in the land food chain completed from a summary |
| sci-g2-s1-u6-l2 | constraint_inferred | Grade 2 wording of الدبال not captured; not asked by definition |
| sci-g2-s2-u9-l1 | constraint_inferred | Grade 2 wording of الكتلة borrowed from grade 3 |
| sci-g3-s1-u3-l1 | constraint_inferred | Book words for herbivores, carnivores and omnivores not confirmed; not asked |
| sci-g3-s1-u3-l2 | ambiguous_skill | Only التكيف and التخفي are confirmed vocabulary |
| sci-g3-s2-u11-l1 | constraint_inferred | New lesson; definition of القوة assumed |
| sci-g3-s2-u11-l2 | constraint_inferred | New lesson; number of simple machine types not confirmed |
| sci-g3-s2-u12-l2 | source_conflict | معتم vs غير شفاف |
| sci-g3-s2-u12-l3 | source_conflict | Title الكهرباء vs الكهرباء من حولنا |

### Not in the bank yet

- Pictures. Every science question is text; nothing asks the child to read a diagram.
- The skills pages (مهارات الاستقصاء), the reading pages, and the اعمل كالعلماء activities.
