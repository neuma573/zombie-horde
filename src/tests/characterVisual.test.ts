import { describe, expect, it } from 'vitest';

import { facingRotation } from '../logic/characterVisual';

describe('humanoid character visual direction', () => {
  it.each([
    [{ x: 1, y: 0 }, 0],
    [{ x: 0, y: 1 }, Math.PI / 2],
    [{ x: -1, y: 0 }, Math.PI],
    [{ x: 1, y: 1 }, Math.PI / 4],
  ])('converts facing vector %o to a container rotation', (direction, rotation) => {
    expect(facingRotation(direction)).toBeCloseTo(rotation);
  });

  it('keeps the previous rotation for an invalid or stationary direction', () => {
    expect(facingRotation({ x: 0, y: 0 }, 1.2)).toBe(1.2);
    expect(facingRotation({ x: Number.NaN, y: 1 }, -0.4)).toBe(-0.4);
  });
});
