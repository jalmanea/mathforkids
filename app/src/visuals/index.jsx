// Renderer registry keyed by exercise.visual.kind. Covers grade 3 semester 1
// and grade 2 semester 1 (counting, data, chance). Fractions, clock, money,
// measurement and geometry come later. Lessons that produce an unregistered
// kind are hidden from the map.

import { PlaceValueChart } from './PlaceValueChart.jsx';
import { ArrayGrid } from './ArrayGrid.jsx';
import { EqualGroups } from './EqualGroups.jsx';
import { ObjectCloud, TallyTable, Pictograph, BarGraph, DataTable, Bag } from './data.jsx';

export const RENDERERS = {
  place_value_chart: PlaceValueChart,
  array: ArrayGrid,
  equal_groups: EqualGroups,
  object_cloud: ObjectCloud,
  tally_table: TallyTable,
  pictograph: Pictograph,
  bar_graph: BarGraph,
  table: DataTable,
  bag: Bag,
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
