import { describe, expect, it } from 'vitest';

import { getEdgeSpawnPosition } from '../logic/spawn';

const noAvoidPosition = undefined;
const noMinimumDistance = 0;

function edgeFor(
  position: { x: number; y: number },
  bounds: { width: number; height: number },
  padding: number,
): string {
  if (position.y === padding) return 'top';
  if (position.x === bounds.width - padding) return 'right';
  if (position.y === bounds.height - padding) return 'bottom';
  if (position.x === padding) return 'left';
  return 'inside';
}

describe('getEdgeSpawnPosition', () => {
  it('uses every play-area edge once per shuffled group', () => {
    const bounds = { width: 360, height: 640 };
    const padding = 20;
    const seed = 0x1234;
    const positions = [0, 1, 2, 3].map((index) => (
      getEdgeSpawnPosition(
        index,
        bounds,
        padding,
        noAvoidPosition,
        noMinimumDistance,
        seed,
      )
    ));

    expect(new Set(positions.map((position) => edgeFor(position, bounds, padding)))).toEqual(
      new Set(['top', 'right', 'bottom', 'left']),
    );
  });

  it('varies repeated positions on each edge instead of reusing production points', () => {
    const bounds = { width: 360, height: 640 };
    const padding = 20;
    const positions = Array.from({ length: 16 }, (_, index) => (
      getEdgeSpawnPosition(index, bounds, padding, undefined, 0, 0x1234)
    ));

    for (const edge of ['top', 'right', 'bottom', 'left']) {
      const edgePositions = positions
        .filter((position) => edgeFor(position, bounds, padding) === edge)
        .map(({ x, y }) => `${x},${y}`);
      expect(edgePositions).toHaveLength(4);
      expect(new Set(edgePositions).size).toBe(edgePositions.length);
    }
  });

  it('uses resized landscape bounds for later spawns', () => {
    const bounds = { width: 960, height: 540 };
    const padding = 20;
    const position = getEdgeSpawnPosition(5, bounds, padding, undefined, 0, 0x1234);

    expect(edgeFor(position, bounds, padding)).not.toBe('inside');
    expect(position.x).toBeGreaterThanOrEqual(padding);
    expect(position.x).toBeLessThanOrEqual(bounds.width - padding);
    expect(position.y).toBeGreaterThanOrEqual(padding);
    expect(position.y).toBeLessThanOrEqual(bounds.height - padding);
  });

  it('chooses another shuffled edge when the scheduled edge is too close to the player', () => {
    const bounds = { width: 360, height: 640 };
    const padding = 20;
    const seed = 0x1234;
    const scheduled = getEdgeSpawnPosition(0, bounds, padding, undefined, 0, seed);
    const position = getEdgeSpawnPosition(0, bounds, padding, scheduled, 160, seed);

    expect(position).not.toEqual(scheduled);
    expect(Math.hypot(position.x - scheduled.x, position.y - scheduled.y)).toBeGreaterThanOrEqual(
      160,
    );
  });

  it('uses a far edge when a small viewport cannot satisfy the minimum distance', () => {
    const avoidPosition = { x: 50, y: 20 };
    const position = getEdgeSpawnPosition(
      0,
      { width: 100, height: 100 },
      20,
      avoidPosition,
      160,
      0x1234,
    );

    expect(Math.hypot(position.x - avoidPosition.x, position.y - avoidPosition.y))
      .toBeGreaterThan(50);
  });

  it('is deterministic for a fixed seed and changes order for another seed', () => {
    const bounds = { width: 2_400, height: 1_600 };
    const sequence = (seed: number) => Array.from({ length: 12 }, (_, index) => (
      getEdgeSpawnPosition(index, bounds, 20, { x: 1_200, y: 800 }, 160, seed)
    ));

    expect(sequence(37)).toEqual(sequence(37));
    expect(sequence(37)).not.toEqual(sequence(38));
  });
});
