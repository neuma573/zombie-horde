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

  it('includes a target whose circle entry point is exactly at maximum range', () => {
    const result = resolveHitscan(origin, direction, 100, [target('boundary', 105, 0, 5)], 1);

    expect(result.hits).toEqual([{
      targetId: 'boundary',
      distance: 100,
      point: { x: 100, y: 0 },
    }]);
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

  it('stops at the nearest structure before a target', () => {
    const result = resolveHitscan(
      origin,
      direction,
      200,
      [target('behind-wall', 100, 0)],
      1,
      [{ x: 60, y: -20, width: 20, height: 40 }],
    );

    expect(result.hits).toEqual([]);
    expect(result.endPoint).toEqual({ x: 60, y: 0 });
  });

  it('lets a structure win when its entry distance ties a target at maximum range', () => {
    const result = resolveHitscan(
      origin,
      direction,
      100,
      [target('boundary', 105, 0, 5)],
      1,
      [{ x: 100, y: -10, width: 10, height: 20 }],
    );

    expect(result.hits).toEqual([]);
    expect(result.endPoint).toEqual({ x: 100, y: 0 });
  });

  it('ignores a structure beyond range when a target starts at the range boundary', () => {
    const result = resolveHitscan(
      origin,
      direction,
      100,
      [target('boundary', 105, 0, 5)],
      1,
      [{ x: 120, y: -10, width: 10, height: 20 }],
    );

    expect(result.hits.map((hit) => hit.targetId)).toEqual(['boundary']);
    expect(result.endPoint).toEqual({ x: 100, y: 0 });
  });

  it('hits a target in front of a structure and ends there for a non-penetrating shot', () => {
    const result = resolveHitscan(
      origin,
      direction,
      200,
      [target('exposed', 40, 0)],
      1,
      [{ x: 60, y: -20, width: 20, height: 40 }],
    );

    expect(result.hits.map((hit) => hit.targetId)).toEqual(['exposed']);
    expect(result.endPoint).toEqual({ x: 35, y: 0 });
  });

  it('lets penetration hit only targets before the first structure', () => {
    const result = resolveHitscan(
      origin,
      direction,
      200,
      [target('first', 30, 0), target('behind-wall', 100, 0)],
      3,
      [{ x: 60, y: -20, width: 20, height: 40 }],
    );

    expect(result.hits.map((hit) => hit.targetId)).toEqual(['first']);
    expect(result.endPoint).toEqual({ x: 60, y: 0 });
  });

  it('uses the closest structure independent of blocker input order', () => {
    const result = resolveHitscan(
      origin,
      direction,
      200,
      [],
      1,
      [
        { x: 120, y: -10, width: 10, height: 20 },
        { x: 50, y: -10, width: 10, height: 20 },
      ],
    );

    expect(result.endPoint).toEqual({ x: 50, y: 0 });
  });
});
