// Renderer registry keyed by exercise.visual.kind. Covers every kind the
// engine produces for grades 2 and 3. A lesson that produces a kind with no
// renderer is hidden from the map, so a new generator kind never shows a
// broken exercise.

import { PlaceValueChart } from './PlaceValueChart.jsx';
import { ArrayGrid } from './ArrayGrid.jsx';
import { EqualGroups } from './EqualGroups.jsx';
import { ObjectCloud, TallyTable, Pictograph, BarGraph, DataTable, Bag } from './data.jsx';
import { FractionModel, FractionCompare, FractionList, SetModel } from './fractions.jsx';
import { Money, Clock, Ruler, GridArea, GridShapes } from './measure.jsx';
import { PlaneShape, Solid, ShapeSequence, ComposeShapes, Polygon, CubeStack, TablesRow } from './geometry.jsx';

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
  fraction_model: FractionModel,
  fraction_compare: FractionCompare,
  fraction_list: FractionList,
  set_model: SetModel,
  money: Money,
  clock: Clock,
  ruler: Ruler,
  grid_area: GridArea,
  grid_shapes: GridShapes,
  plane_shape: PlaneShape,
  solid: Solid,
  shape_sequence: ShapeSequence,
  compose_shapes: ComposeShapes,
  polygon: Polygon,
  cube_stack: CubeStack,
  tables_row: TablesRow,
};

export function isRenderable(exercise) {
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
