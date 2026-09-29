// Fraction visuals (grade 2 ch. 8, grade 3 ch. 11) and stacked fraction text.

// ---------- Stacked fractions inside text ----------

// The engine wraps every fraction in LRI…PDI isolates: "⁦٣/٤⁩" (a part may be "؟").
const ISOLATED = /⁦([^⁩/]+)\/([^⁩]+)⁩/g;

/** A fraction written the textbook way: numerator over a bar over denominator. */
export function Frac({ num, den }) {
  return (
    <span class="frac" role="math" aria-label={`${num} على ${den}`}>
      <span class="frac-num">{num}</span>
      <span class="frac-den">{den}</span>
    </span>
  );
}

/** Text with every isolated fraction rendered stacked; plain text otherwise. */
export function MathText({ text }) {
  if (!text || !text.includes('⁦')) return text;
  const out = [];
  let last = 0;
  for (const m of text.matchAll(ISOLATED)) {
    if (m.index > last) out.push(text.slice(last, m.index));
    out.push(<Frac key={m.index} num={m[1]} den={m[2]} />);
    last = m.index + m[0].length;
  }
  if (last < text.length) out.push(text.slice(last));
  return <>{out}</>;
}

// ---------- Area models ----------

/**
 * One whole divided into `parts` equal parts with `shaded` of them coloured.
 * `parts: null` draws the whole with no divisions; `shaded: null` leaves it
 * unshaded. Both are used when that number is the blank to find.
 */
export function FractionModel({ model, parts, shaded, width = 220 }) {
  if (model === 'circle') return <Pie parts={parts} shaded={shaded} />;
  const H = model === 'strip' ? 36 : 90;
  const W = model === 'strip' ? width : Math.min(width, 180);
  const n = parts ?? 1;
  const w = (W - 4) / n;
  // Shade from the right: the first part in Arabic reading order.
  return (
    <svg viewBox={`0 0 ${W} ${H + 4}`} width={W} class="frac-model" role="img">
      {Array.from({ length: n }, (_, i) => (
        <rect key={i} x={2 + W - 4 - (i + 1) * w} y="2" width={w} height={H}
          class={parts && shaded != null && i < shaded ? 'part on' : 'part'} />
      ))}
      {parts == null && <text x={W / 2} y={H / 2 + 9} text-anchor="middle" class="frac-q">؟</text>}
    </svg>
  );
}

function Pie({ parts, shaded }) {
  const R = 60, c = 64;
  if (parts === 1) return <svg viewBox="0 0 128 128" width="128" class="frac-model"><circle cx={c} cy={c} r={R} class={shaded ? 'part on' : 'part'} /></svg>;
  const pt = (k) => {
    const a = -Math.PI / 2 + (2 * Math.PI * k) / parts;
    return `${(c + R * Math.cos(a)).toFixed(2)},${(c + R * Math.sin(a)).toFixed(2)}`;
  };
  return (
    <svg viewBox="0 0 128 128" width="128" class="frac-model" role="img">
      {Array.from({ length: parts }, (_, i) => (
        <path key={i} d={`M${c},${c} L${pt(i)} A${R},${R} 0 0 1 ${pt(i + 1)} Z`} class={shaded != null && i < shaded ? 'part on' : 'part'} />
      ))}
    </svg>
  );
}

/** Two strips of the same length, one above the other, so the parts line up. */
export function FractionCompare({ left, right }) {
  return (
    <div class="frac-stack">
      <FractionModel {...left} width={260} />
      <FractionModel {...right} width={260} />
    </div>
  );
}

export function FractionList({ items }) {
  return <div class="frac-stack">{items.map((m, i) => <FractionModel key={i} {...m} width={260} />)}</div>;
}

// ---------- Set model ----------

/**
 * `total` balls, `highlighted` of them red. With `groups`, the balls are
 * split into that many equal groups and none is coloured: the child finds
 * the part (e.g. ٢/٣ of ١٢) from the groups.
 */
export function SetModel({ total, highlighted, groups }) {
  if (groups) {
    const size = total / groups;
    return (
      <div class="set-groups">
        {Array.from({ length: groups }, (_, g) => (
          <span class="set-group" key={g}>{Array.from({ length: size }, (_, i) => <Ball key={i} />)}</span>
        ))}
      </div>
    );
  }
  return (
    <div class="set-groups">
      <span class="set-plain">{Array.from({ length: total }, (_, i) => <Ball key={i} red={i < highlighted} />)}</span>
    </div>
  );
}

function Ball({ red }) {
  return (
    <svg viewBox="0 0 30 30" width="38" height="38" aria-hidden="true">
      <circle cx="15" cy="15" r="12" class={red ? 'ball-red' : 'ball-plain'} />
      <circle cx="11" cy="11" r="3.5" fill="#fff" opacity="0.45" />
    </svg>
  );
}
