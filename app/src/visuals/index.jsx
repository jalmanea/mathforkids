// Renderer registry keyed by exercise.visual.kind. Grade 3 semester 1 needs
// three; the semester 2 kinds (fractions, clock, money, charts, measurement)
// come later. Lessons that produce an unregistered kind are hidden from the map.

import { PlaceValueChart } from './PlaceValueChart.jsx';
import { ArrayGrid } from './ArrayGrid.jsx';
import { EqualGroups } from './EqualGroups.jsx';

export const RENDERERS = {
  place_value_chart: PlaceValueChart,
  array: ArrayGrid,
  equal_groups: EqualGroups,
};

/** Stacked-fraction display is not implemented yet either. */
export function isRenderable(exercise) {
  if (exercise.data?.display) return false;
  return !exercise.visual || exercise.visual.kind in RENDERERS;
}

export function Visual({ visual }) {
  if (!visual) return null;
  const R = RENDERERS[visual.kind];
  if (!R) return <div class="visual-missing">هذا الرسم غير مدعوم بعد</div>;
  return (
    <figure class="visual" aria-hidden="true">
      <R {...visual} />
    </figure>
  );
}
