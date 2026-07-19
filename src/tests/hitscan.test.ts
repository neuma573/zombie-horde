import { describe, expect, it } from 'vitest';

import { resolveHitscan, type HitscanTarget } from '../logic/hitscan';

const origin = { x: 0, y: 0 };
const direction = { x: 1, y: 0 };

function target(id: string, x: number, y: number, radius = 5): HitscanTarget {
  return { id, position: { x, y }, radius };
}

describe('resolveHitscan', () => {
  it('hits the nearest target first and stops a non-penetrating shot', () => {
    const result = resolveHitscan(
      origin,
      direction,
      200,
      [target('far', 100, 0), target('near', 50, 0)],
      1,
    );

    expect(result.hits).toEqual([{
      targetId: 'near',
      distance: 45,
      point: { x: 45, y: 0 },
    }]);
    expect(result.endPoint).toEqual({ x: 45, y: 0 });
  });

  it('hits penetrating targets in entry-distance order up to maxTargets', () => {
    const result = resolveHitscan(
      origin,
      direction,
      200,
      [target('third', 90, 0), target('first', 30, 0), target('second', 60, 0)],
      2,
    );

    expect(result.hits.map((hit) => hit.targetId)).toEqual(['first', 'second']);
    expect(result.endPoint).toEqual({ x: 55, y: 0 });
  });

  it('continues to maximum range when fewer targets are hit than maxTargets', () => {
    const result = resolveHitscan(origin, direction, 120, [target('only', 50, 0)], 2);

    expect(result.hits.map((hit) => hit.targetId)).toEqual(['only']);
    expect(result.endPoint).toEqual({ x: 120, y: 0 });
  });

  it('filters targets outside the ray direction, radius, or range', () => {
    const result = resolveHitscan(
      origin,
      direction,
      100,
      [target('behind', -20, 0), target('off-ray', 40, 10, 5), target('too-far', 110, 0, 5)],
      3,
    );

    expect(result.hits).toEqual([]);
    expect(result.endPoint).toEqual({ x: 100, y: 0 });
  });

  it('normalizes the supplied direction', () => {
    const result = resolveHitscan(origin, { x: 10, y: 0 }, 100, [target('hit', 50, 0)], 1);

    expect(result.hits[0].distance).toBe(45);
    expect(result.hits[0].point).toEqual({ x: 45, y: 0 });
  });

  it('uses target id as a deterministic tie breaker', () => {
    const result = resolveHitscan(
      origin,
      direction,
      100,
      [target('b', 50, 0), target('a', 50, 0)],
      2,
    );

    expect(result.hits.map((hit) => hit.targetId)).toEqual(['a', 'b']);
  });

  it('treats a target containing the origin as an immediate hit', () => {
    const result = resolveHitscan(origin, direction, 100, [target('overlapping', 0, 0, 10)], 1);

    expect(result.hits[0]).toEqual({
      targetId: 'overlapping',
      distance: 0,
      point: origin,
    });
    expect(result.endPoint).toEqual(origin);
  });

  it('returns no shot for an invalid direction', () => {
    const result = resolveHitscan(origin, { x: 0, y: 0 }, 100, [target('hit', 50, 0)], 1);

    expect(result).toEqual({ hits: [], endPoint: origin });
  });

  it('blocks targets behind the nearest blocking obstacle', () => {
    const result = resolveHitscan(
      origin,
      direction,
      200,
      [target('before', 40, 0), target('behind', 140, 0)],
      2,
      [{ x: 80, y: -20, width: 20, height: 40, blocksHitscan: true }],
    );

    expect(result.hits.map((hit) => hit.targetId)).toEqual(['before']);
    expect(result.endPoint).toEqual({ x: 80, y: 0 });
  });

  it('allows shots through an obstacle configured as non-blocking', () => {
    const result = resolveHitscan(
      origin,
      direction,
      200,
      [target('behind', 140, 0)],
      1,
      [{ x: 80, y: -20, width: 20, height: 40, blocksHitscan: false }],
    );

    expect(result.hits.map((hit) => hit.targetId)).toEqual(['behind']);
  });

  it('uses the closest blocking obstacle regardless of config order', () => {
    const result = resolveHitscan(
      origin,
      direction,
      200,
      [],
      1,
      [
        { x: 120, y: -20, width: 20, height: 40, blocksHitscan: true },
        { x: 60, y: -20, width: 20, height: 40, blocksHitscan: true },
      ],
    );

    expect(result.endPoint).toEqual({ x: 60, y: 0 });
  });

  it('preserves a target at maximum range when blockers are farther away', () => {
    const result = resolveHitscan(
      origin,
      direction,
      100,
      [target('boundary', 110, 0, 10)],
      1,
      [{ x: 120, y: -20, width: 20, height: 40, blocksHitscan: true }],
    );

    expect(result.hits.map((hit) => hit.targetId)).toEqual(['boundary']);
  });
});
