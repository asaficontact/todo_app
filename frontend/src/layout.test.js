import { describe, it, expect } from 'vitest';
import { getGridPosition, getGridPositions } from './layout.js';

describe('getGridPosition', () => {
  it('places a single item at origin', () => {
    const pos = getGridPosition(0, 1);
    expect(pos.x).toBeCloseTo(0);
    expect(pos.y).toBeCloseTo(0);
    expect(pos.z).toBe(0);
  });

  it('places three items on one row centered', () => {
    const pos0 = getGridPosition(0, 3);
    const pos1 = getGridPosition(1, 3);
    const pos2 = getGridPosition(2, 3);
    // All on same row (y equal)
    expect(pos0.y).toBe(pos1.y);
    expect(pos1.y).toBe(pos2.y);
    // Symmetrically placed: first and last mirror each other
    expect(pos0.x).toBeCloseTo(-pos2.x);
    // Center card at x=0
    expect(pos1.x).toBeCloseTo(0);
  });

  it('wraps to second row after 3 items', () => {
    const row0 = getGridPosition(0, 4);
    const row1 = getGridPosition(3, 4);
    expect(row1.y).toBeLessThan(row0.y); // rows go downward
  });

  it('z is always 0', () => {
    for (let i = 0; i < 6; i++) {
      expect(getGridPosition(i, 6).z).toBe(0);
    }
  });
});

describe('getGridPositions', () => {
  it('returns empty array for 0 items', () => {
    expect(getGridPositions(0)).toEqual([]);
  });

  it('returns count items', () => {
    expect(getGridPositions(5)).toHaveLength(5);
  });

  it('each position matches getGridPosition', () => {
    const positions = getGridPositions(4);
    positions.forEach((pos, i) => {
      const expected = getGridPosition(i, 4);
      expect(pos.x).toBeCloseTo(expected.x);
      expect(pos.y).toBeCloseTo(expected.y);
      expect(pos.z).toBe(expected.z);
    });
  });

  it('row centering: a single item in the last row is centered at x=0', () => {
    // 4 items: row 0 has 3, row 1 has 1 — the lone item should be at x=0
    const pos3 = getGridPositions(4)[3];
    expect(pos3.x).toBeCloseTo(0);
  });

  it('two items are placed symmetrically', () => {
    const [p0, p1] = getGridPositions(2);
    expect(p0.x).toBeCloseTo(-p1.x);
    expect(p0.y).toBeCloseTo(p1.y);
  });
});
