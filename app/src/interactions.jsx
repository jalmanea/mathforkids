// Interactive answers: the child builds the answer instead of choosing it.
// Which exercises get one, and how a construction is checked, is decided in
// game/interaction.js (pure, tested). This file is only the touch UI.

import { useRef, useState } from 'preact/hooks';
import { interactionValue, solutionState, moveHand, pickHand } from './game/interaction.js';
import { MathText, FractionModel } from './visuals/fractions.jsx';
import { Clock, MoneyItem } from './visuals/measure.jsx';
import { ShapeGlyph } from './visuals/geometry.jsx';
import { ar } from './components.jsx';

const range = (n) => Array.from({ length: n }, (_, i) => i);

/** Toggle a member of a Set held in state. Functional update: two taps in one frame both count. */
const toggleIn = (setState, key) => setState((prev) => {
  const next = new Set(prev);
  next.has(key) ? next.delete(key) : next.add(key);
  return next;
});

// ---------- order: drag rows up and down ----------

const ROW = 62;

function OrderList({ it, state, setState, locked }) {
  // `state` is the list of item indexes, first to last. Rows keep their DOM
  // order and are positioned by transform, so a drag never re-mounts the row
  // that holds the pointer capture.
  const drag = useRef(null);
  const orderRef = useRef(state);
  orderRef.current = state;
  const [lift, setLift] = useState(null); // { item, dy }

  const down = (e, item) => {
    if (locked) return;
    try { e.currentTarget.setPointerCapture(e.pointerId); } catch { /* synthetic pointer */ }
    drag.current = { item, startY: e.clientY };
    setLift({ item, dy: 0 });
  };
  const move = (e) => {
    const d = drag.current;
    if (!d) return;
    const order = orderRef.current;
    const pos = order.indexOf(d.item);
    let dy = e.clientY - d.startY;
    const shift = Math.max(-pos, Math.min(order.length - 1 - pos, Math.round(dy / ROW)));
    if (shift) {
      const next = [...order];
      next.splice(pos, 1);
      next.splice(pos + shift, 0, d.item);
      orderRef.current = next;
      setState(next);
      d.startY += shift * ROW;
      dy -= shift * ROW;
    }
    setLift({ item: d.item, dy });
  };
  const up = () => {
    drag.current = null;
    setLift(null);
  };

  return (
    <div class="order-list" style={{ height: `${state.length * ROW}px` }}>
      {range(it.items.length).map((item) => {
        const pos = state.indexOf(item);
        const lifted = lift?.item === item;
        return (
          <div
            key={item}
            class={`order-row ${lifted ? 'lifted' : ''}`}
            style={{ transform: `translateY(${pos * ROW + (lifted ? lift.dy : 0)}px)` }}
            onPointerDown={(e) => down(e, item)}
            onPointerMove={move}
            onPointerUp={up}
            onPointerCancel={up}
          >
            <span class="order-rank">{ar(pos + 1)}</span>
            <span class="order-item"><MathText text={it.items[item]} /></span>
            <span class="order-grip" aria-hidden="true">⋮⋮</span>
          </div>
        );
      })}
    </div>
  );
}

// ---------- set_clock: drag the hands ----------

function ClockSetter({ it, state, setState, locked }) {
  const active = useRef(null);
  const angleAt = (e) => {
    const r = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - (r.left + r.width / 2), y = e.clientY - (r.top + r.height / 2);
    return ((Math.atan2(y, x) * 180) / Math.PI + 90 + 360) % 360;
  };
  const down = (e) => {
    if (locked) return;
    const a = angleAt(e);
    const r = e.currentTarget.getBoundingClientRect();
    const reach = Math.hypot(e.clientX - (r.left + r.width / 2), e.clientY - (r.top + r.height / 2)) / (r.width / 2);
    active.current = pickHand(state, a, reach, it.step);
    try { e.currentTarget.setPointerCapture(e.pointerId); } catch { /* synthetic pointer */ }
    const hand = active.current;
    setState((t) => moveHand(t, hand, a, it.step));
  };
  const move = (e) => {
    const hand = active.current;
    if (!hand || locked) return;
    const a = angleAt(e);
    setState((t) => moveHand(t, hand, a, it.step));
  };
  const up = () => { active.current = null; };
  return (
    <div class="clock-set">
      <Clock hour={state.hour} minute={state.minute} svgProps={{ onPointerDown: down, onPointerMove: move, onPointerUp: up, onPointerCancel: up }} />
      <p class="hint">{it.step === 60 ? 'اسحب العقرب القصير إلى الساعة.' : 'اسحب العقرب القصير للساعات والطويل للدقائق.'}</p>
    </div>
  );
}

// ---------- pay: tap notes and coins ----------

function PayTray({ it, state, setState, locked }) {
  const toggle = (i) => !locked && toggleIn(setState, i);
  return (
    <div class="pay-tray">
      {it.tray.map((value, i) => (
        <button key={i} class="pay-item" aria-pressed={state.has(i)} onClick={() => toggle(i)} aria-label={`${ar(value)} ريال`}>
          <MoneyItem value={value} />
        </button>
      ))}
    </div>
  );
}

// ---------- symmetry: tap the lines ----------

function SymmetryPicker({ it, state, setState, locked }) {
  const toggle = (id) => !locked && toggleIn(setState, id);
  return (
    <div class="sym-pick">
      <svg viewBox="-6 -6 132 132" direction="ltr" class="plane" role="img">
        <ShapeGlyph name={it.shape} />
        {it.lines.map((l) => (
          <g key={l.id} onClick={() => toggle(l.id)} role="button" aria-pressed={state.has(l.id)} data-line={l.id}>
            <line x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2} class={`sym-line ${state.has(l.id) ? 'on' : ''}`} />
            <line x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2} class="sym-hit" />
          </g>
        ))}
      </svg>
      <p class="hint">المس الخط لاختياره، والمسه مرة أخرى لإلغائه.</p>
    </div>
  );
}

// ---------- shade: tap parts of the shape ----------

function ShadePicker({ it, state, setState, locked }) {
  const toggle = (i) => !locked && toggleIn(setState, i);
  return (
    <div class="shade-pick">
      <FractionModel model={it.model} parts={it.parts} selected={state} onPart={toggle} width={280} />
    </div>
  );
}

// ---------- wrapper ----------

const KINDS = {
  order: { View: OrderList, initial: (it) => range(it.items.length), ready: () => true, value: (it, s) => s.map((i) => it.items[i]) },
  set_clock: { View: ClockSetter, initial: () => ({ hour: 12, minute: 0 }), ready: () => true, value: (it, s) => s },
  pay: { View: PayTray, initial: () => new Set(), ready: (s) => s.size > 0, value: (it, s) => [...s].map((i) => it.tray[i]) },
  symmetry: { View: SymmetryPicker, initial: () => new Set(), ready: (s) => s.size > 0, value: (it, s) => [...s] },
  shade: { View: ShadePicker, initial: () => new Set(), ready: (s) => s.size > 0, value: (it, s) => s.size },
};

/** The solved state in the shape each view keeps, shown after three misses. */
function solvedViewState(it) {
  const sol = solutionState(it);
  switch (it.kind) {
    case 'order': {
      const left = range(it.items.length);
      return sol.map((text) => left.splice(left.findIndex((i) => it.items[i] === text), 1)[0]);
    }
    case 'pay': {
      const left = range(it.tray.length);
      return new Set(sol.map((v) => left.splice(left.findIndex((i) => it.tray[i] === v), 1)[0]));
    }
    case 'symmetry': return new Set(sol);
    case 'shade': return new Set(range(sol));
    default: return sol;
  }
}

/**
 * @param {Object} props
 * @param {Object} props.it        from interactionFor
 * @param {string} props.answer    exercise.answer
 * @param {boolean} props.done     the exercise is finished (correct or revealed)
 * @param {boolean} props.reveal   show the solution
 * @param {(value:string)=>void} props.onSubmit
 */
export function Interaction({ it, answer, done, reveal, onSubmit }) {
  const kind = KINDS[it.kind];
  const [state, setState] = useState(() => kind.initial(it));
  const shown = reveal ? solvedViewState(it) : state;
  return (
    <>
      <kind.View it={it} state={shown} setState={setState} locked={done} />
      {!done && (
        <button class="btn" disabled={!kind.ready(state)} onClick={() => onSubmit(interactionValue(it, kind.value(it, state), answer))}>
          تحقق
        </button>
      )}
    </>
  );
}
