import { describe, expect, it } from 'vitest';

import { isPositionVisible, type FogOfWarConfig } from '../logic/fogOfWar';

const config: FogOfWarConfig = {
  nearbyVisionRadius: 100,
  viewDistance: 500,
  viewHalfAngleRadians: Math.PI / 4,
};
const player = { x: 200, y: 200 };
const aim = { x: 1, y: 0 };

describe('fog of war visibility', () => {
  it('always reveals positions in the nearby radius', () => {
    expect(isPositionVisible(player, aim, { x: 150, y: 200 }, config)).toBe(true);
    expect(isPositionVisible(player, aim, { x: 200, y: 299 }, config)).toBe(true);
  });

  it('reveals distant positions inside the aimed vision cone', () => {
    expect(isPositionVisible(player, aim, { x: 500, y: 200 }, config)).toBe(true);
    expect(isPositionVisible(player, aim, { x: 400, y: 390 }, config)).toBe(true);
  });

  it('hides positions outside the cone or beyond view distance', () => {
    expect(isPositionVisible(player, aim, { x: 200, y: 350 }, config)).toBe(false);
    expect(isPositionVisible(player, aim, { x: 701, y: 200 }, config)).toBe(false);
    expect(isPositionVisible(player, aim, { x: 0, y: 200 }, config)).toBe(false);
  });

  it('does not produce visibility from a zero aim direction beyond nearby vision', () => {
    expect(isPositionVisible(player, { x: 0, y: 0 }, { x: 400, y: 200 }, config)).toBe(false);
  });
});
