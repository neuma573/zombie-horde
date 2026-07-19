import { describe, expect, it } from 'vitest';

import { moveCircleWithObstacles } from '../logic/obstacleCollision';

const obstacle = { x: 100, y: 100, width: 100, height: 100 };
const bounds = { width: 500, height: 500, padding: 10 };

describe('player obstacle collision', () => {
  it('does not alter movement when the path is clear', () => {
    expect(moveCircleWithObstacles(
      { x: 20, y: 20 },
      { x: 80, y: 80 },
      10,
      [obstacle],
      bounds,
    )).toEqual({ x: 80, y: 80 });
  });

  it('prevents tunneling through an obstacle during a large movement', () => {
    expect(moveCircleWithObstacles(
      { x: 20, y: 150 },
      { x: 300, y: 150 },
      10,
      [obstacle],
      bounds,
    )).toEqual({ x: 90, y: 150 });
  });

  it('uses the moving entity radius when stopping a zombie-sized circle', () => {
    expect(moveCircleWithObstacles(
      { x: 20, y: 150 },
      { x: 300, y: 150 },
      20,
      [obstacle],
      { ...bounds, padding: 20 },
    )).toEqual({ x: 80, y: 150 });
  });

  it('preserves tangential movement while sliding along an obstacle', () => {
    const result = moveCircleWithObstacles(
      { x: 50, y: 150 },
      { x: 150, y: 190 },
      10,
      [obstacle],
      bounds,
    );

    expect(result.x).toBeCloseTo(90);
    expect(result.y).toBeCloseTo(190);
  });

  it('cannot enter a gap narrower than the circle diameter', () => {
    const obstacles = [
      { x: 100, y: 100, width: 100, height: 100 },
      { x: 211, y: 100, width: 100, height: 100 },
    ];
    const result = moveCircleWithObstacles(
      { x: 205.5, y: 50 },
      { x: 205.5, y: 250 },
      10,
      obstacles,
      bounds,
    );

    expect(result.y).toBeCloseTo(90);
  });

  it('matches movement split across multiple frames', () => {
    const start = { x: 50, y: 150 };
    const end = { x: 150, y: 190 };
    const oneStep = moveCircleWithObstacles(start, end, 10, [obstacle], bounds);
    const halfway = moveCircleWithObstacles(start, { x: 100, y: 170 }, 10, [obstacle], bounds);
    const twoSteps = moveCircleWithObstacles(halfway, end, 10, [obstacle], bounds);

    expect(twoSteps.x).toBeCloseTo(oneStep.x);
    expect(twoSteps.y).toBeCloseTo(oneStep.y);
  });
});
