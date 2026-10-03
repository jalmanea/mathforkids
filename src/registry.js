// Maps generator keys (as written in curriculum.json) to generator functions.
import numbers from './generators/numbers.js';
import addition from './generators/addition.js';
import subtraction from './generators/subtraction.js';
import multiplication from './generators/multiplication.js';
import division from './generators/division.js';
import fractions from './generators/fractions.js';
import measurement from './generators/measurement.js';
import geometry from './generators/geometry.js';
import data from './generators/data.js';
import word from './generators/word.js';
import science from './generators/science.js';

export const GENERATORS = {
  ...numbers,
  ...addition,
  ...subtraction,
  ...multiplication,
  ...division,
  ...fractions,
  ...measurement,
  ...geometry,
  ...data,
  ...word,
  ...science,
  /**
   * Mixed practice: pick one entry from a pool of {generator, params}.
   * Used by investigation (استقصاء) and review/practice lessons, which draw on the unit's skills.
   */
  mix(ctx) {
    const i = ctx.rng.int(0, ctx.params.pool.length - 1);
    const entry = ctx.params.pool[i];
    const gen = GENERATORS[entry.generator];
    if (!gen) throw new Error(`mix: unknown generator ${entry.generator}`);
    const ex = gen({ ...ctx, params: entry.params });
    ex.data.mix_entry = i; // which sub-skill of the mix was drawn (analytics + validation)
    return ex;
  },
};
