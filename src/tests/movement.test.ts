import { describe, expect, it } from 'vitest';

import { moveToward, moveWithinBounds } from '../logic/movement';

const bounds = { width: 800, height: 600, padding: 20 };

describe('moveWithinBounds', () => {
  it('moves the same distance regardless of delta partitioning', () => {
    const start = { x: 100, y: 100 };
    const oneStep = moveWithinBounds(start, { x: 1, y: 0 }, 200, 1_000, bounds);
    const firstHalf = moveWithinBounds(start, { x: 1, y: 0 }, 200, 500, bounds);
    const twoSteps = moveWithinBounds(firstHalf, { x: 1, y: 0 }, 200, 500, bounds);

    expect(twoSteps).toEqual(oneStep);
  });

  it('normalizes diagonal input to the configured speed', () => {
    const start = { x: 100, y: 100 };
    const horizontal = moveWithinBounds(start, { x: 1, y: 0 }, 100, 1_000, bounds);
    const diagonal = moveWithinBounds(start, { x: 1, y: 1 }, 100, 1_000, bounds);

    expect(Math.hypot(horizontal.x - start.x, horizontal.y - start.y)).toBeCloseTo(100);
    expect(Math.hypot(diagonal.x - start.x, diagonal.y - start.y)).toBeCloseTo(100);
  });

  it('keeps the player inside the padded world bounds', () => {
    const next = moveWithinBounds(
      { x: 25, y: 580 },
      { x: -1, y: 1 },
      500,
      1_000,
      bounds,
    );

    expect(next).toEqual({ x: 20, y: 580 });
  });
});

describe('moveToward', () => {
  it('moves the same distance regardless of delta partitioning', () => {
    const start = { x: 0, y: 0 };
    const target = { x: 300, y: 400 };
    const oneStep = moveToward(start, target, 100, 1_000);
    const firstHalf = moveToward(start, target, 100, 500);
    const twoSteps = moveToward(firstHalf, target, 100, 500);

    expect(twoSteps.x).toBeCloseTo(oneStep.x);
    expect(twoSteps.y).toBeCloseTo(oneStep.y);
  });

  it('stops at the target instead of overshooting', () => {
    expect(moveToward({ x: 0, y: 0 }, { x: 10, y: 0 }, 100, 1_000)).toEqual({ x: 10, y: 0 });
  });
});
