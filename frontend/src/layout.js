const COLS = 3;
const H_SPACING = 3.4; // card width 2.8 + 0.6 gap
const V_SPACING = 2.0; // card height 1.6 + 0.4 gap

export function getGridPositions(count) {
  return Array.from({ length: count }, (_, i) => getGridPosition(i, count));
}

export function getGridPosition(index, count) {
  const col = index % COLS;
  const row = Math.floor(index / COLS);
  const totalRows = Math.ceil(count / COLS);
  // Count cards in this row (last row may have fewer)
  const rowCount = Math.min(COLS, count - row * COLS);
  // Center each row independently
  const xOffset = (col - (rowCount - 1) / 2) * H_SPACING;
  const yOffset = -(row - (totalRows - 1) / 2) * V_SPACING;
  return { x: xOffset, y: yOffset, z: 0 };
}
