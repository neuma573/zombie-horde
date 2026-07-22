import { describe, expect, it } from 'vitest';

import {
  findCircleCollisionCandidatePairs,
  ENTITY_SEPARATION_PAIR_CHECK_BUDGET,
  separateCircleEntities,
  separateCircleEntitiesWithinBudget,
} from '../logic/entityCollision';
import { circlesOverlap } from '../logic/contactDamage';
import { getEdgeSpawnPosition } from '../logic/spawn';

const bounds = { width: 500, height: 500 };

function distance(first: { x: number; y: number }, second: { x: number; y: number }): number {
  return Math.hypot(first.x - second.x, first.y - second.y);
}

function maximumOverlap(
  entities: readonly { position: { x: number; y: number }; radius: number }[],
): number {
  let maximum = 0;
  for (let first = 0; first < entities.length; first += 1) {
    for (let second = first + 1; second < entities.length; second += 1) {
      maximum = Math.max(
        maximum,
        entities[first].radius + entities[second].radius
          - distance(entities[first].position, entities[second].position),
      );
    }
  }
  return maximum;
}

describe('dynamic circle separation', () => {
  it('uses spatial cells to exclude distant entities from collision candidates', () => {
    const entities = Array.from({ length: 100 }, (_, index) => ({
      id: `zombie-${index.toString().padStart(3, '0')}`,
      position: { x: index * 100, y: 100 },
      radius: 20,
    }));

    expect(findCircleCollisionCandidatePairs(entities)).toHaveLength(0);
  });

  it('includes neighboring cells when circles can overlap across a cell boundary', () => {
    const pairs = findCircleCollisionCandidatePairs([
      { id: 'zombie-a', position: { x: 47, y: 20 }, radius: 20 },
      { id: 'zombie-b', position: { x: 49, y: 20 }, radius: 20 },
      { id: 'distant', position: { x: 300, y: 300 }, radius: 20 },
    ]);

    expect(pairs).toEqual([['zombie-a', 'zombie-b']]);
  });

  it('expands the neighboring-cell search for larger circles', () => {
    const pairs = findCircleCollisionCandidatePairs([
      { id: 'large', position: { x: 20, y: 20 }, radius: 70 },
      { id: 'near-large', position: { x: 125, y: 20 }, radius: 40 },
    ]);

    expect(pairs).toEqual([['large', 'near-large']]);
  });

  it('leaves non-overlapping entities unchanged', () => {
    const result = separateCircleEntities([
      { id: 'a', position: { x: 100, y: 100 }, radius: 10 },
      { id: 'b', position: { x: 140, y: 100 }, radius: 10 },
    ], [], bounds);

    expect(result.get('a')).toEqual({ x: 100, y: 100 });
    expect(result.get('b')).toEqual({ x: 140, y: 100 });
  });

  it('separates two overlapping zombies equally', () => {
    const result = separateCircleEntities([
      { id: 'zombie-1', position: { x: 100, y: 100 }, radius: 20 },
      { id: 'zombie-2', position: { x: 120, y: 100 }, radius: 20 },
    ], [], bounds);
    const first = result.get('zombie-1')!;
    const second = result.get('zombie-2')!;

    expect(distance(first, second)).toBeCloseTo(40);
    expect((first.x + second.x) / 2).toBeCloseTo(110);
  });

  it('moves the zombie while preserving the player position', () => {
    const result = separateCircleEntities([
      { id: 'player', position: { x: 100, y: 100 }, radius: 18, immovable: true },
      { id: 'zombie-1', position: { x: 110, y: 100 }, radius: 20 },
    ], [], bounds);

    expect(result.get('player')).toEqual({ x: 100, y: 100 });
    expect(distance(result.get('player')!, result.get('zombie-1')!)).toBeCloseTo(38);
    expect(circlesOverlap(
      { position: result.get('player')!, radius: 18 },
      { position: result.get('zombie-1')!, radius: 20 },
    )).toBe(true);
  });

  it('separates entities that start at exactly the same position deterministically', () => {
    const entities = [
      { id: 'zombie-2', position: { x: 200, y: 200 }, radius: 20 },
      { id: 'zombie-1', position: { x: 200, y: 200 }, radius: 20 },
    ];
    const forward = separateCircleEntities(entities, [], bounds);
    const reversed = separateCircleEntities([...entities].reverse(), [], bounds);

    expect(forward).toEqual(reversed);
    expect(distance(forward.get('zombie-1')!, forward.get('zombie-2')!)).toBeCloseTo(40);
  });

  it('uses the previous relative position when movement ends at the same point', () => {
    const result = separateCircleEntities([
      {
        id: 'zombie-left',
        previousPosition: { x: 80, y: 100 },
        position: { x: 100, y: 100 },
        radius: 20,
      },
      {
        id: 'zombie-right',
        previousPosition: { x: 120, y: 100 },
        position: { x: 100, y: 100 },
        radius: 20,
      },
    ], [], bounds);

    expect(result.get('zombie-left')).toEqual({ x: 80, y: 100 });
    expect(result.get('zombie-right')).toEqual({ x: 120, y: 100 });
  });

  it('does not let entity IDs change the coincident movement normal', () => {
    const resolve = (leftId: string, rightId: string) => separateCircleEntities([
      {
        id: leftId,
        previousPosition: { x: 100, y: 80 },
        position: { x: 100, y: 100 },
        radius: 20,
      },
      {
        id: rightId,
        previousPosition: { x: 100, y: 120 },
        position: { x: 100, y: 100 },
        radius: 20,
      },
    ], [], bounds);
    const first = resolve('a', 'z');
    const renamed = resolve('z', 'a');

    expect([...first.values()].map((position) => position.y).sort((a, b) => a - b))
      .toEqual([...renamed.values()].map((position) => position.y).sort((a, b) => a - b));
  });

  it('moves the priority player when an obstacle blocks zombie separation', () => {
    const obstacle = { x: 130, y: 50, width: 50, height: 100 };
    const result = separateCircleEntities([
      { id: 'player', position: { x: 100, y: 100 }, radius: 18, immovable: true },
      { id: 'zombie-1', position: { x: 120, y: 100 }, radius: 10 },
    ], [obstacle], bounds);

    expect(result.get('zombie-1')!.x).toBeLessThanOrEqual(120);
    expect(result.get('player')!.x).toBeCloseTo(92);
    expect(distance(result.get('player')!, result.get('zombie-1')!)).toBeCloseTo(28);
  });

  it('moves the priority player when a world edge blocks zombie separation', () => {
    const result = separateCircleEntities([
      { id: 'player', position: { x: 30, y: 100 }, radius: 18, immovable: true },
      { id: 'zombie-1', position: { x: 10, y: 100 }, radius: 10 },
    ], [], bounds);

    expect(result.get('zombie-1')).toEqual({ x: 10, y: 100 });
    expect(result.get('player')!.x).toBeCloseTo(38);
    expect(distance(result.get('player')!, result.get('zombie-1')!)).toBeCloseTo(28);
  });

  it('resolves a small crowd without remaining overlaps', () => {
    const result = separateCircleEntities([
      { id: 'player', position: { x: 250, y: 250 }, radius: 18, immovable: true },
      { id: 'zombie-1', position: { x: 250, y: 250 }, radius: 20 },
      { id: 'zombie-2', position: { x: 255, y: 250 }, radius: 20 },
      { id: 'zombie-3', position: { x: 250, y: 255 }, radius: 20 },
    ], [], bounds);
    const positions = [...result.values()];
    const radii = [18, 20, 20, 20];

    for (let first = 0; first < positions.length; first += 1) {
      for (let second = first + 1; second < positions.length; second += 1) {
        expect(distance(positions[first], positions[second]))
          .toBeGreaterThanOrEqual(radii[first] + radii[second] - 0.01);
      }
    }
  });

  it('keeps separating a dense late-wave crowd across bounded frames until clear', () => {
    let crowd = Array.from({ length: 50 }, (_, index) => ({
      id: `zombie-${index.toString().padStart(2, '0')}`,
      position: {
        x: 460 + index % 10 * 8,
        y: 460 + Math.floor(index / 10) * 16,
      },
      radius: 20,
    }));
    let complete = false;
    let nextPairOffset = 0;

    for (let frame = 0; frame < 20 && !complete; frame += 1) {
      const result = separateCircleEntitiesWithinBudget(
        crowd,
        [],
        { width: 1_000, height: 1_000 },
        { startPairOffset: nextPairOffset },
      );
      expect(result.pairChecks).toBeLessThanOrEqual(ENTITY_SEPARATION_PAIR_CHECK_BUDGET);
      crowd = crowd.map((entity) => ({
        ...entity,
        previousPosition: entity.position,
        position: result.positions.get(entity.id)!,
      }));
      complete = result.complete;
      nextPairOffset = result.nextPairOffset;
    }

    expect(complete).toBe(true);
    const positions = crowd.map((entity) => entity.position);

    for (let first = 0; first < positions.length; first += 1) {
      for (let second = first + 1; second < positions.length; second += 1) {
        expect(distance(positions[first], positions[second])).toBeGreaterThanOrEqual(39.999);
      }
    }
  });

  it('separates repeated edge spawn positions in the same update', () => {
    const spawned = Array.from({ length: 5 }, (_, index) => ({
      id: `zombie-${index + 1}`,
      position: getEdgeSpawnPosition(index, bounds, 20),
      previousPosition: getEdgeSpawnPosition(index, bounds, 20),
      radius: 20,
    }));
    const result = separateCircleEntities(spawned, [], bounds);

    expect(distance(result.get('zombie-1')!, result.get('zombie-5')!))
      .toBeGreaterThanOrEqual(40 - 0.01);
  });

  it('bounds work for pathological repeated spawn batches', () => {
    const spawned = Array.from({ length: 40 }, (_, index) => {
      const position = getEdgeSpawnPosition(index, bounds, 20);
      return {
        id: `zombie-${index.toString().padStart(2, '0')}`,
        position,
        previousPosition: position,
        radius: 20,
      };
    });
    const result = separateCircleEntitiesWithinBudget(spawned, [], bounds, {
      maxPairChecks: 500,
    });
    const resolved = spawned.map((entity) => ({
      ...entity,
      position: result.positions.get(entity.id)!,
    }));

    expect(result.pairChecks).toBeLessThanOrEqual(500);
    expect(maximumOverlap(resolved)).toBeLessThan(maximumOverlap(spawned));
  });
});
