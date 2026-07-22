import { describe, expect, it } from 'vitest';

import { separatePlayerFromZombies } from '../logic/entityCollision';

const bounds = { width: 500, height: 500 };

function distance(first: { x: number; y: number }, second: { x: number; y: number }): number {
  return Math.hypot(first.x - second.x, first.y - second.y);
}

describe('player-zombie collision separation', () => {
  it('moves an overlapping zombie while preserving the player position', () => {
    const result = separatePlayerFromZombies(
      { position: { x: 100, y: 100 }, radius: 18 },
      [{ id: 'zombie-1', position: { x: 120, y: 100 }, radius: 20 }],
      [],
      bounds,
    );

    expect(result.playerPosition).toEqual({ x: 100, y: 100 });
    expect(distance(result.playerPosition, result.zombiePositions.get('zombie-1')!))
      .toBeCloseTo(38);
  });

  it('does not move bodies that are not overlapping', () => {
    const result = separatePlayerFromZombies(
      { position: { x: 100, y: 100 }, radius: 18 },
      [{ id: 'zombie-1', position: { x: 200, y: 100 }, radius: 20 }],
      [],
      bounds,
    );

    expect(result.playerPosition).toEqual({ x: 100, y: 100 });
    expect(result.zombiePositions.get('zombie-1')).toEqual({ x: 200, y: 100 });
  });

  it('uses previous relative positions when both centers coincide', () => {
    const result = separatePlayerFromZombies(
      {
        position: { x: 100, y: 100 },
        previousPosition: { x: 80, y: 100 },
        radius: 18,
      },
      [{
        id: 'zombie-1',
        position: { x: 100, y: 100 },
        previousPosition: { x: 120, y: 100 },
        radius: 20,
      }],
      [],
      bounds,
    );

    expect(result.zombiePositions.get('zombie-1')!.x).toBeGreaterThan(100);
    expect(distance(result.playerPosition, result.zombiePositions.get('zombie-1')!))
      .toBeCloseTo(38);
  });

  it('moves the player when an obstacle blocks zombie separation', () => {
    const result = separatePlayerFromZombies(
      { position: { x: 100, y: 100 }, radius: 18 },
      [{ id: 'zombie-1', position: { x: 120, y: 100 }, radius: 10 }],
      [{ x: 130, y: 50, width: 50, height: 100 }],
      bounds,
    );

    expect(result.playerPosition.x).toBeLessThan(100);
    expect(distance(result.playerPosition, result.zombiePositions.get('zombie-1')!))
      .toBeCloseTo(28);
  });

  it('fully resolves a pair squeezed against world bounds in one update', () => {
    const result = separatePlayerFromZombies(
      {
        position: { x: 167.7, y: 178.8 },
        previousPosition: { x: 167.7, y: 178.8 },
        radius: 18,
      },
      [{
        id: 'zombie-1',
        position: { x: 172.45, y: 174.77 },
        previousPosition: { x: 172.45, y: 174.77 },
        radius: 20,
      }],
      [],
      { width: 200, height: 200 },
    );

    expect(distance(result.playerPosition, result.zombiePositions.get('zombie-1')!))
      .toBeGreaterThanOrEqual(38 - 0.000001);
  });

  it('produces the same result regardless of zombie input order', () => {
    const player = { position: { x: 100, y: 100 }, radius: 18 };
    const zombies = [
      { id: 'zombie-b', position: { x: 115, y: 100 }, radius: 20 },
      { id: 'zombie-a', position: { x: 85, y: 100 }, radius: 20 },
    ];
    const forward = separatePlayerFromZombies(player, zombies, [], bounds);
    const reversed = separatePlayerFromZombies(player, [...zombies].reverse(), [], bounds);

    expect(reversed).toEqual(forward);
  });

  it('terminates with finite valid positions when the world cannot fit both bodies', () => {
    const result = separatePlayerFromZombies(
      { position: { x: 20, y: 20 }, radius: 20 },
      [{ id: 'zombie-1', position: { x: 20, y: 20 }, radius: 20 }],
      [],
      { width: 40, height: 40 },
    );
    const positions = [result.playerPosition, result.zombiePositions.get('zombie-1')!];

    for (const position of positions) {
      expect(Number.isFinite(position.x)).toBe(true);
      expect(Number.isFinite(position.y)).toBe(true);
      expect(position.x).toBeGreaterThanOrEqual(0);
      expect(position.x).toBeLessThanOrEqual(40);
      expect(position.y).toBeGreaterThanOrEqual(0);
      expect(position.y).toBeLessThanOrEqual(40);
    }
  });
});
