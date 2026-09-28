// Equal groups: `groups` plates with `size` counters on each.
export function EqualGroups({ groups, size }) {
  const per = Math.ceil(Math.sqrt(size));
  const rowsIn = Math.ceil(size / per);
  const step = 18;
  const plate = Math.max(per, rowsIn) * step + 22;
  return (
    <div class="groups">
      {Array.from({ length: groups }, (_, g) => (
        <svg key={g} viewBox={`0 0 ${plate} ${plate}`} width={Math.min(plate, 96)} role="img">
          <circle cx={plate / 2} cy={plate / 2} r={plate / 2 - 2} class="plate" />
          {Array.from({ length: size }, (_, k) => {
            const row = Math.floor(k / per);
            const inRow = row === rowsIn - 1 ? size - row * per : per;
            const col = k % per;
            const x = plate / 2 + (col - (inRow - 1) / 2) * step;
            const y = plate / 2 + (row - (rowsIn - 1) / 2) * step;
            return <circle key={k} cx={x} cy={y} r="7" class="counter" />;
          })}
        </svg>
      ))}
    </div>
  );
}
