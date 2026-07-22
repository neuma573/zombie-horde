import { describe, expect, it } from 'vitest';

import {
  queryZombieCollisionCandidates,
  spatialCellForPosition,
  type ZombieSpatialEntry,
} from '../logic/zombieSpatialGrid';

const zombie = (
  id: string,
  x: number,
  y: number,
  radius = 20,
): ZombieSpatialEntry => ({ id, position: { x, y }, radius });

describe('zombie spatial grid candidate query', () => {
  it('includes zombies in the same cell', () => {
    const result = queryZombieCollisionCandidates([
      zombie('zombie-a', 10, 10),
      zombie('zombie-b', 40, 10),
    ]);

    expect(result).toEqual({
      pairs: [{ firstId: 'zombie-a', secondId: 'zombie-b' }],
      checks: 1,
      valid: true,
      complete: true,
    });
  });

  it('includes touching candidates across a cell boundary', () => {
    const result = queryZombieCollisionCandidates([
      zombie('zombie-a', 63, 20, 2),
      zombie('zombie-b', 65, 20, 2),
    ]);

    expect(result.pairs).toEqual([
      { firstId: 'zombie-a', secondId: 'zombie-b' },
    ]);
  });

  it('excludes entries outside the necessary neighbor range', () => {
    const result = queryZombieCollisionCandidates([
      zombie('zombie-a', 0, 0),
      zombie('zombie-b', 500, 0),
    ]);

    expect(result).toMatchObject({ pairs: [], checks: 0, complete: true });
  });

  it('uses floor-based deterministic cells for negative coordinates', () => {
    expect(spatialCellForPosition({ x: -1, y: -65 }, 64)).toEqual({ x: -1, y: -2 });
  });

  it('does not miss candidates with different radii', () => {
    const result = queryZombieCollisionCandidates([
      zombie('zombie-a', 0, 0, 100),
      zombie('zombie-b', 150, 0, 60),
    ]);

    expect(result.pairs).toEqual([
      { firstId: 'zombie-a', secondId: 'zombie-b' },
    ]);
  });

  it('does not scan empty coordinate ranges for very large finite radii', () => {
    const result = queryZombieCollisionCandidates([
      zombie('zombie-a', 0, 0, 1_000_000_000),
      zombie('zombie-b', 2_000_000_000, 0, 1_000_000_000),
    ], { cellSize: 0.5, maxCandidateChecks: 1 });

    expect(result).toEqual({
      pairs: [{ firstId: 'zombie-a', secondId: 'zombie-b' }],
      checks: 1,
      valid: true,
      complete: true,
    });
  });

  it('returns canonical duplicate-free pairs independent of input order', () => {
    const entries = [
      zombie('zombie-c', 20, 20),
      zombie('zombie-a', 20, 20),
      zombie('zombie-b', 20, 20),
    ];
    const expected = [
      { firstId: 'zombie-a', secondId: 'zombie-b' },
      { firstId: 'zombie-a', secondId: 'zombie-c' },
      { firstId: 'zombie-b', secondId: 'zombie-c' },
    ];

    expect(queryZombieCollisionCandidates(entries).pairs).toEqual(expected);
    expect(queryZombieCollisionCandidates([...entries].reverse()).pairs).toEqual(expected);
    expect(queryZombieCollisionCandidates(entries).pairs).toEqual(expected);
  });

  it('reports invalid input without returning partial candidates', () => {
    expect(queryZombieCollisionCandidates([
      zombie('duplicate', 0, 0),
      zombie('duplicate', 10, 0),
    ])).toEqual({
      pairs: [],
      checks: 0,
      valid: false,
      complete: false,
      error: 'duplicate-id',
    });
    expect(queryZombieCollisionCandidates([
      zombie('zombie-a', Number.NaN, 0),
    ])).toMatchObject({ valid: false, complete: false, error: 'invalid-position' });
  });

  it('rejects inputs above the explicit preprocessing limit', () => {
    const result = queryZombieCollisionCandidates([
      zombie('zombie-a', 0, 0),
      zombie('zombie-b', 10, 0),
      zombie('zombie-c', 20, 0),
    ], { maxEntries: 2 });

    expect(result).toEqual({
      pairs: [],
      checks: 0,
      valid: false,
      complete: false,
      error: 'entry-limit-exceeded',
    });
  });

  it('spends one-check budgets on one actual candidate', () => {
    const result = queryZombieCollisionCandidates([
      zombie('zombie-a', 20, 20),
      zombie('zombie-b', 20, 20),
      zombie('zombie-c', 20, 20),
    ], { maxCandidateChecks: 1 });

    expect(result).toEqual({
      pairs: [{ firstId: 'zombie-a', secondId: 'zombie-b' }],
      checks: 1,
      valid: true,
      complete: false,
    });
  });

  it('spends two-check budgets on two actual candidates', () => {
    const result = queryZombieCollisionCandidates([
      zombie('zombie-a', 20, 20),
      zombie('zombie-b', 20, 20),
      zombie('zombie-c', 20, 20),
    ], { maxCandidateChecks: 2 });

    expect(result.pairs).toHaveLength(2);
    expect(result).toMatchObject({ checks: 2, valid: true, complete: false });
  });

  it('reports completion when the exact budget covers every candidate', () => {
    const result = queryZombieCollisionCandidates([
      zombie('zombie-a', 20, 20),
      zombie('zombie-b', 20, 20),
      zombie('zombie-c', 20, 20),
    ], { maxCandidateChecks: 3 });

    expect(result).toMatchObject({ checks: 3, valid: true, complete: true });
  });

  it('bounds dense candidate generation without allocating the full pair set', () => {
    const entries = Array.from({ length: 500 }, (_, index) => (
      zombie(`zombie-${index.toString().padStart(3, '0')}`, 20, 20)
    ));
    const result = queryZombieCollisionCandidates(entries, { maxCandidateChecks: 100 });

    expect(result.pairs).toHaveLength(100);
    expect(result).toMatchObject({ checks: 100, valid: true, complete: false });
  });

  it('checks fewer pairs than a full combination for distributed entries', () => {
    const entries = Array.from({ length: 100 }, (_, index) => (
      zombie(`zombie-${index.toString().padStart(3, '0')}`, index * 200, 0)
    ));
    const result = queryZombieCollisionCandidates(entries);

    expect(result.complete).toBe(true);
    expect(result.checks).toBeLessThan(entries.length * (entries.length - 1) / 2);
  });
});
