// Multiplication array: `rows` rows of `cols` counters.
export function ArrayGrid({ rows, cols }) {
  const gap = 34;
  const r = 12;
  const width = cols * gap + 12;
  const height = rows * gap + 12;
  const dots = [];
  for (let i = 0; i < rows; i++) {
    for (let j = 0; j < cols; j++) {
      dots.push(<circle key={`${i}-${j}`} cx={6 + gap / 2 + j * gap} cy={6 + gap / 2 + i * gap} r={r} class="counter" />);
    }
  }
  return (
    <svg class="array-grid" viewBox={`0 0 ${width} ${height}`} width={Math.min(width, 320)} role="img">
      {Array.from({ length: rows }, (_, i) => (
        <rect key={i} x="2" y={4 + i * gap} width={width - 4} height={gap - 4} rx={(gap - 4) / 2} class="array-row" />
      ))}
      {dots}
    </svg>
  );
}
