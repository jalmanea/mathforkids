// Science (العلوم): questions drawn from a lesson's content bank.
//
// Unlike math, a science lesson cannot be computed from number ranges. Each
// lesson in curriculum/science.json carries a `content` object, and this one
// generator turns it into several question forms:
//
//   terms      [{ term, def }]                  the lesson's vocabulary (المفردات)
//   groups     [{ which, categories: [{ name, pick, members: [] }] }]
//                                                things sorted into categories
//   sequences  [{ name, steps: [] }]            ordered stages (life cycles, …)
//   questions  [{ q, a, wrong: [], level? }]    written questions
//
// Forms and the tier they start at:
//   term.name      1   the definition is given, choose the word
//   term.meaning   2   the word is given, choose the definition
//   group.member   1   "which of these is a …?" (category.pick is the question)
//   group.category 1   set.which with {x} replaced by a member
//   seq.next       1   what comes after a step of a sequence
//   seq.first      1   what a sequence starts with
//   question       question.level (default 1)
//
// All text is authored in the JSON; nothing here builds Arabic sentences beyond
// filling {x} and quoting, so there is no grammar to get wrong.
import { stringMC } from './common.js';

const quote = (s) => `«${s}»`;

/** Every askable thing in the lesson's content at this tier, as { form, ref }. */
function atomsOf(content, level) {
  const atoms = [];
  const terms = content.terms ?? [];
  if (terms.length >= 3) {
    terms.forEach((t, i) => {
      atoms.push({ form: 'term.name', ref: i });
      if (level >= 2) atoms.push({ form: 'term.meaning', ref: i });
    });
  }
  (content.groups ?? []).forEach((set, s) => {
    set.categories.forEach((c, k) => {
      // One "pick a member" atom per member keeps big categories from being under-asked.
      c.members.forEach((_, m) => atoms.push({ form: 'group.member', ref: [s, k, m] }));
      if (set.which) c.members.forEach((_, m) => atoms.push({ form: 'group.category', ref: [s, k, m] }));
    });
  });
  (content.sequences ?? []).forEach((seq, s) => {
    atoms.push({ form: 'seq.first', ref: [s, 0] });
    for (let i = 0; i < seq.steps.length - 1; i++) atoms.push({ form: 'seq.next', ref: [s, i] });
  });
  (content.questions ?? []).forEach((q, i) => {
    if ((q.level ?? 1) <= level) atoms.push({ form: 'question', ref: i });
  });
  return atoms;
}

const KIND_CAP = 8;

/**
 * Pick the kind of question first (terms, groups, sequences, written), then one
 * of its atoms. A kind counts for at most KIND_CAP, so a long sorting list
 * (twenty animals) does not crowd out the lesson's other questions.
 */
function pickAtom(rng, atoms) {
  const kinds = new Map();
  for (const a of atoms) {
    const kind = a.form.split('.')[0];
    if (!kinds.has(kind)) kinds.set(kind, []);
    kinds.get(kind).push(a);
  }
  const lists = [...kinds.values()];
  let r = rng.next() * lists.reduce((n, l) => n + Math.min(l.length, KIND_CAP), 0);
  for (const l of lists) {
    r -= Math.min(l.length, KIND_CAP);
    if (r < 0) return rng.pick(l);
  }
  return rng.pick(lists[lists.length - 1]);
}

/**
 * params: { level: 1|2, forms?: string[] }  (forms limits which question forms are used)
 */
function quiz(ctx) {
  const { rng, params, lesson } = ctx;
  const content = lesson.content;
  if (!content) throw new Error(`${lesson.id}: science lesson has no content`);
  let atoms = atomsOf(content, params.level ?? 1);
  if (params.forms) atoms = atoms.filter((a) => params.forms.includes(a.form));
  if (!atoms.length) throw new Error(`${lesson.id}: no questions at level ${params.level}`);
  const { form, ref } = pickAtom(rng, atoms);
  const skill = `sci.${form}.${lesson.id.replace(/^sci-/, '')}`;
  const base = { skill, type: 'multiple_choice' };

  if (form === 'term.name' || form === 'term.meaning') {
    const t = content.terms[ref];
    const others = rng.shuffle(content.terms.filter((o) => o !== t));
    const toName = form === 'term.name';
    return stringMC(ctx, {
      ...base,
      prompt: toName ? `ما الكلمة التي تعني: ${quote(t.def)}؟` : `ما معنى ${quote(t.term)}؟`,
      answer: toName ? t.term : t.def,
      wrong: others.map((o) => (toName ? o.term : o.def)),
      data: { form, term: t.term, answer_value: toName ? t.term : t.def },
    });
  }

  if (form === 'group.member' || form === 'group.category') {
    const [s, k, m] = ref;
    const set = content.groups[s];
    const cat = set.categories[k];
    const member = cat.members[m];
    if (form === 'group.member') {
      const outsiders = set.categories.filter((c) => c !== cat).flatMap((c) => c.members);
      return stringMC(ctx, {
        ...base,
        prompt: cat.pick,
        answer: member,
        wrong: rng.shuffle(outsiders),
        data: { form, set: s, category: cat.name, answer_value: member },
      });
    }
    return stringMC(ctx, {
      ...base,
      prompt: set.which.replace('{x}', member),
      answer: cat.name,
      wrong: rng.shuffle(set.categories.filter((c) => c !== cat).map((c) => c.name)),
      data: { form, set: s, member, answer_value: cat.name },
    });
  }

  if (form === 'seq.next' || form === 'seq.first') {
    const [s, i] = ref;
    const seq = content.sequences[s];
    const answer = form === 'seq.first' ? seq.steps[0] : seq.steps[i + 1];
    const prompt = form === 'seq.first'
      ? `ما أول مرحلة في ${seq.name}؟`
      : `في ${seq.name}، ماذا يأتي بعد ${quote(seq.steps[i])}؟`;
    return stringMC(ctx, {
      ...base,
      type: 'ordering',
      prompt,
      answer,
      wrong: rng.shuffle(seq.steps.filter((x, j) => x !== answer && !(form === 'seq.next' && j === i))),
      data: { form, sequence: s, index: i, answer_value: answer },
    });
  }

  const q = content.questions[ref];
  return stringMC(ctx, {
    ...base,
    prompt: q.q,
    answer: q.a,
    wrong: rng.shuffle(q.wrong),
    data: { form, question: ref, answer_value: q.a },
  });
}

export default { 'sci.quiz': quiz };
