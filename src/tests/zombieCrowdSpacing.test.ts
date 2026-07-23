import { describe, expect, it } from 'vitest';

import { moveCircleWithObstacles } from '../logic/obstacleCollision';
import { moveToward } from '../logic/movement';
import {
  moveZombieWithCrowdSpacing,
  resolveZombieCrowdSpacing,
  zombieVelocityWithCrowdSpacing,
  type ZombieCrowdSpacingConfig,
} from '../logic/zombieCrowdSpacing';
import { queryZombieCollisionCandidates, type ZombieSpatialEntry } from '../logic/zombieSpatialGrid';

const config: ZombieCrowdSpacingConfig = {
  minimumDistanceRatio: 0.9,
  maximumSeparationSpeed: 36,
};
const zombie = (id: string, x: number, y: number, radius = 20): ZombieSpatialEntry => ({
  id,
  position: { x, y },
  radius,
});

function query(entries: readonly ZombieSpatialEntry[]) {
  return queryZombieCollisionCandidates(entries);
}

describe('zombie crowd spacing', () => {
  it('does not repel pairs outside or exactly at the minimum distance', () => {
    const outside = [zombie('a', 0, 0), zombie('b', 40, 0)];
    const boundary = [zombie('a', 0, 0), zombie('b', 36, 0)];

    expect(resolveZombieCrowdSpacing(outside, query(outside), config, 80).velocities)
      .toEqual(new Map([['a', { x: 0, y: 0 }], ['b', { x: 0, y: 0 }]]));
    expect(resolveZombieCrowdSpacing(boundary, query(boundary), config, 80).velocities)
      .toEqual(new Map([['a', { x: 0, y: 0 }], ['b', { x: 0, y: 0 }]]));
  });

  it('applies equal and opposite velocity inside the minimum distance', () => {
    const entries = [zombie('a', 0, 0), zombie('b', 18, 0)];
    const result = resolveZombieCrowdSpacing(entries, query(entries), config, 80);

    expect(result.valid).toBe(true);
    expect(result.velocities.get('a')).toEqual({ x: -18, y: 0 });
    expect(result.velocities.get('b')).toEqual({ x: 18, y: 0 });
  });

  it('uses finite deterministic opposite directions for coincident centers', () => {
    const entries = [zombie('a', 10, 10), zombie('b', 10, 10)];
    const first = resolveZombieCrowdSpacing(entries, query(entries), config, 80);
    const second = resolveZombieCrowdSpacing([...entries].reverse(), query(entries), config, 80);
    const firstVelocity = first.velocities.get('a')!;
    const secondVelocity = first.velocities.get('b')!;

    expect(first).toEqual(second);
    expect(Number.isFinite(firstVelocity.x)).toBe(true);
    expect(Number.isFinite(firstVelocity.y)).toBe(true);
    expect(secondVelocity.x).toBeCloseTo(-firstVelocity.x);
    expect(secondVelocity.y).toBeCloseTo(-firstVelocity.y);
  });

  it('keeps zero-radius and invalid settings finite', () => {
    const entries = [zombie('a', 0, 0, 0), zombie('b', 0, 0, 0)];
    const result = resolveZombieCrowdSpacing(entries, query(entries), {
      minimumDistanceRatio: Number.NaN,
      maximumSeparationSpeed: Number.POSITIVE_INFINITY,
    }, 80);

    expect(result).toEqual({
      valid: true,
      velocities: new Map([['a', { x: 0, y: 0 }], ['b', { x: 0, y: 0 }]]),
    });
  });

  it('combines multiple neighbors and stays within the separation speed', () => {
    const entries = [
      zombie('a', 0, 0),
      zombie('b', 10, 0),
      zombie('c', 0, 10),
      zombie('d', -10, 0),
    ];
    const result = resolveZombieCrowdSpacing(entries, query(entries), config, 80);

    for (const velocity of result.velocities.values()) {
      expect(Math.hypot(velocity.x, velocity.y)).toBeLessThanOrEqual(36);
    }
  });

  it('is independent of entry and candidate order', () => {
    const entries = [zombie('c', 0, 10), zombie('a', 0, 0), zombie('b', 10, 0)];
    const candidates = query(entries);
    const reversedCandidates = {
      ...candidates,
      pairs: [...candidates.pairs].reverse().map((pair) => ({
        firstId: pair.secondId,
        secondId: pair.firstId,
      })),
    };

    expect(resolveZombieCrowdSpacing(entries, candidates, config, 80))
      .toEqual(resolveZombieCrowdSpacing([...entries].reverse(), reversedCandidates, config, 80));
  });

  it('rejects unknown candidate ids without partial spacing', () => {
    const entries = [zombie('a', 0, 0), zombie('b', 10, 0)];
    const result = resolveZombieCrowdSpacing(entries, {
      pairs: [{ firstId: 'a', secondId: 'missing' }],
      checks: 1,
      valid: true,
      complete: true,
    }, config, 80);

    expect(result).toEqual({ velocities: new Map(), valid: false });
  });

  it('does not apply invalid or incomplete spatial queries', () => {
    const entries = [zombie('a', 0, 0), zombie('b', 10, 0)];
    const incomplete = queryZombieCollisionCandidates(entries, { maxCandidateChecks: 1 });
    incomplete.complete = false;

    expect(resolveZombieCrowdSpacing(entries, incomplete, config, 80))
      .toEqual({ velocities: new Map(), valid: false });
    expect(resolveZombieCrowdSpacing(entries, {
      pairs: [], checks: 0, valid: false, complete: false,
    }, config, 80)).toEqual({ velocities: new Map(), valid: false });
  });

  it('preserves chase movement without separation candidates', () => {
    const start = { x: 0, y: 0 };
    const target = { x: 100, y: 0 };
    const velocity = zombieVelocityWithCrowdSpacing(start, target, 80, { x: 0, y: 0 });

    expect(moveZombieWithCrowdSpacing(start, target, velocity, 500))
      .toEqual(moveToward(start, target, 80, 500));
  });

  it('does not apply leftover separation after reaching the chase target', () => {
    expect(moveZombieWithCrowdSpacing(
      { x: 100, y: 100 },
      { x: 100, y: 100 },
      { x: 20, y: -10 },
      500,
    )).toEqual({ x: 100, y: 100 });
  });

  it('caps final speed and preserves a forward chase component', () => {
    const velocity = zombieVelocityWithCrowdSpacing(
      { x: 0, y: 0 },
      { x: 100, y: 0 },
      80,
      { x: -36, y: 36 },
    );

    expect(Math.hypot(velocity.x, velocity.y)).toBeLessThanOrEqual(80);
    expect(velocity.x).toBeGreaterThan(0);
  });

  it('accumulates the same movement for a fixed velocity across delta partitions', () => {
    const target = { x: 1_000, y: 0 };
    const velocity = { x: 60, y: 20 };
    const oneStep = moveZombieWithCrowdSpacing({ x: 0, y: 0 }, target, velocity, 1_000);
    const firstHalf = moveZombieWithCrowdSpacing({ x: 0, y: 0 }, target, velocity, 500);
    const secondHalf = moveZombieWithCrowdSpacing(firstHalf, target, velocity, 500);

    expect(secondHalf.x).toBeCloseTo(oneStep.x);
    expect(secondHalf.y).toBeCloseTo(oneStep.y);
  });

  it('stops the whole step at the target consistently across delta partitions', () => {
    const start = { x: 0, y: 0 };
    const target = { x: 10, y: 0 };
    const velocity = { x: 80, y: 20 };
    const oneStep = moveZombieWithCrowdSpacing(start, target, velocity, 1_000);
    const firstHalf = moveZombieWithCrowdSpacing(start, target, velocity, 500);
    const secondHalf = moveZombieWithCrowdSpacing(firstHalf, target, velocity, 500);

    expect(oneStep).toEqual(target);
    expect(secondHalf).toEqual(oneStep);
  });

  it('keeps crowd movement outside obstacles and world bounds', () => {
    const start = { x: 80, y: 100 };
    const desired = moveZombieWithCrowdSpacing(
      start,
      { x: 300, y: 100 },
      { x: 80, y: 20 },
      1_000,
    );
    const resolved = moveCircleWithObstacles(
      start,
      desired,
      20,
      [{ x: 100, y: 80, width: 40, height: 80 }],
      { width: 300, height: 200, padding: 20 },
    );

    expect(resolved.x).toBeLessThanOrEqual(80);
    expect(resolved.x).toBeGreaterThanOrEqual(20);
    expect(resolved.y).toBeGreaterThanOrEqual(20);
    expect(resolved.y).toBeLessThanOrEqual(180);
  });
});
