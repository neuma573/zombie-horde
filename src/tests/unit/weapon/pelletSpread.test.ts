import { describe, expect, it } from 'vitest';

import { createPelletDirections } from '../../../logic/weapon';

describe('shotgun pellet spread', () => {
  it('creates deterministic normalized directions irregularly across the cone', () => {
    const directions = createPelletDirections({ x: 1, y: 0 }, 8, 12, 42);
    const repeated = createPelletDirections({ x: 1, y: 0 }, 8, 12, 42);
    const angles = directions.map((direction) => (
      Math.atan2(direction.y, direction.x) * 180 / Math.PI
    ));

    expect(directions).toHaveLength(8);
    expect(repeated).toEqual(directions);
    expect(angles.every((angle) => angle >= -6 && angle <= 6)).toBe(true);
    expect(new Set(angles.map((angle) => angle.toFixed(3))).size).toBe(8);
    for (const direction of directions) {
      expect(Math.hypot(direction.x, direction.y)).toBeCloseTo(1);
    }
  });

  it('changes the pellet pattern between shots', () => {
    expect(createPelletDirections({ x: 1, y: 0 }, 8, 16, 1)).not.toEqual(
      createPelletDirections({ x: 1, y: 0 }, 8, 16, 2),
    );
  });

  it('returns no pellets for an invalid aim direction', () => {
    expect(createPelletDirections({ x: 0, y: 0 }, 8, 16)).toEqual([]);
  });
});
