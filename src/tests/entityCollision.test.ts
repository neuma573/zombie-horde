import { describe, expect, it } from 'vitest';

import {
  findCircleCollisionCandidatePairs,
  separateCircleEntities,
} from '../logic/entityCollision';
import { circlesOverlap } from '../logic/contactDamage';

const bounds = { width: 500, height: 500 };

function distance(first: { x: number; y: number }, second: { x: number; y: number }): number {
  return Math.hypot(first.x - second.x, first.y - second.y);
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

  it('does not push a separated zombie into an obstacle', () => {
    const obstacle = { x: 130, y: 50, width: 50, height: 100 };
    const result = separateCircleEntities([
      { id: 'player', position: { x: 100, y: 100 }, radius: 18, immovable: true },
      { id: 'zombie-1', position: { x: 120, y: 100 }, radius: 10 },
    ], [obstacle], bounds);

    expect(result.get('zombie-1')!.x).toBeLessThanOrEqual(120);
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
});
