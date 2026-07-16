import { describe, expect, it } from 'vitest';

import { getEdgeSpawnPosition } from '../logic/spawn';

describe('getEdgeSpawnPosition', () => {
  it('uses the current portrait play area', () => {
    const bounds = { width: 360, height: 640 };

    expect(getEdgeSpawnPosition(0, bounds, 20)).toEqual({ x: 180, y: 20 });
    expect(getEdgeSpawnPosition(1, bounds, 20)).toEqual({ x: 340, y: 320 });
    expect(getEdgeSpawnPosition(2, bounds, 20)).toEqual({ x: 180, y: 620 });
    expect(getEdgeSpawnPosition(3, bounds, 20)).toEqual({ x: 20, y: 320 });
  });

  it('uses resized landscape bounds for later spawns', () => {
    expect(getEdgeSpawnPosition(5, { width: 960, height: 540 }, 20)).toEqual({
      x: 940,
      y: 270,
    });
  });

  it('chooses another edge when the scheduled edge is too close to the player', () => {
    const position = getEdgeSpawnPosition(
      0,
      { width: 360, height: 640 },
      20,
      { x: 180, y: 100 },
      160,
    );

    expect(position).toEqual({ x: 340, y: 320 });
    expect(Math.hypot(position.x - 180, position.y - 100)).toBeGreaterThanOrEqual(160);
  });

  it('uses the farthest edge when a small viewport cannot satisfy the minimum distance', () => {
    expect(getEdgeSpawnPosition(
      0,
      { width: 100, height: 100 },
      20,
      { x: 50, y: 20 },
      160,
    )).toEqual({ x: 50, y: 80 });
  });
});
