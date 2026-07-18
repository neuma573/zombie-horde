import { describe, expect, it } from 'vitest';

import { moveCircleWithObstacles } from '../logic/obstacleCollision';

const obstacle = { x: 100, y: 100, width: 100, height: 100 };
const bounds = { width: 500, height: 500, padding: 10 };

describe('circle obstacle collision', () => {
  it('leaves movement unchanged when no obstacle intersects the path', () => {
    expect(moveCircleWithObstacles(
      { x: 20, y: 20 },
      { x: 80, y: 80 },
      10,
      [obstacle],
      bounds,
    )).toEqual({ x: 80, y: 80 });
  });

  it('prevents tunneling through a wall during a large movement', () => {
    const result = moveCircleWithObstacles(
      { x: 20, y: 150 },
      { x: 300, y: 150 },
      10,
      [obstacle],
      bounds,
    );

    expect(result.x).toBeCloseTo(90, 4);
    expect(result.y).toBe(150);
  });

  it('slides along the obstacle instead of discarding tangential movement', () => {
    const result = moveCircleWithObstacles(
      { x: 50, y: 150 },
      { x: 150, y: 250 },
      10,
      [obstacle],
      bounds,
    );

    expect(result.x).toBeCloseTo(90, 4);
    expect(result.y).toBeCloseTo(250, 4);
  });

  it('does not use the square corner of an expanded AABB as a false collision', () => {
    expect(moveCircleWithObstacles(
      { x: 70, y: 85 },
      { x: 95, y: 85 },
      10,
      [obstacle],
      bounds,
    )).toEqual({ x: 95, y: 85 });
  });

  it('stops at the rounded rectangle corner on a diagonal path', () => {
    const result = moveCircleWithObstacles(
      { x: 70, y: 70 },
      { x: 130, y: 130 },
      10,
      [obstacle],
      bounds,
    );

    expect(result.x).toBeCloseTo(100 - Math.SQRT1_2 * 10, 4);
    expect(result.y).toBeCloseTo(100 - Math.SQRT1_2 * 10, 4);
  });

  it('matches partitioned movement when approaching a wall directly', () => {
    const start = { x: 20, y: 150 };
    const oneStep = moveCircleWithObstacles(start, { x: 300, y: 150 }, 10, [obstacle], bounds);
    const halfway = moveCircleWithObstacles(start, { x: 160, y: 150 }, 10, [obstacle], bounds);
    const twoSteps = moveCircleWithObstacles(halfway, { x: 300, y: 150 }, 10, [obstacle], bounds);

    expect(twoSteps.x).toBeCloseTo(oneStep.x, 4);
    expect(twoSteps.y).toBeCloseTo(oneStep.y, 4);
  });

  it('consumes movement after more than three sequential corner contacts', () => {
    const pointObstacle = (x: number, y: number) => ({ x, y, width: 0, height: 0 });
    const obstacles = [
      pointObstacle(121.7364818, 90.1519225),
      pointObstacle(143.1159000, 94.0769820),
      pointObstacle(163.4903340, 101.6527040),
      pointObstacle(182.2390000, 112.6520000),
    ];
    const result = moveCircleWithObstacles(
      { x: 100, y: 100 },
      { x: 300, y: 100 },
      10,
      obstacles,
      { width: 500, height: 500, padding: 10 },
    );

    expect(result.x).toBeGreaterThan(175);
    expect(result.y).toBeGreaterThan(110);
  });
});
