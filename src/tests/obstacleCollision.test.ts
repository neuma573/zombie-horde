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
      { x: 150, y: 190 },
      10,
      [obstacle],
      bounds,
    );

    expect(result.x).toBeCloseTo(90, 4);
    expect(result.y).toBeCloseTo(190, 4);
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

  it('re-sweeps after sliding beyond a finite face', () => {
    const start = { x: 20, y: 20 };
    const end = { x: 140, y: 260 };
    const oneStep = moveCircleWithObstacles(start, end, 10, [obstacle], bounds);
    let partitioned = start;

    for (let step = 1; step <= 10; step += 1) {
      partitioned = moveCircleWithObstacles(
        partitioned,
        {
          x: partitioned.x + (end.x - start.x) / 10,
          y: partitioned.y + (end.y - start.y) / 10,
        },
        10,
        [obstacle],
        bounds,
      );
    }

    expect(oneStep.x).toBeCloseTo(partitioned.x, 4);
    expect(oneStep.y).toBeCloseTo(partitioned.y, 4);
    expect(oneStep.x).toBeGreaterThan(90);
    expect(oneStep.y).toBeGreaterThanOrEqual(260);
  });

  it('re-checks the rounded corner after leaving a finite face', () => {
    const start = { x: 20, y: 125 };
    const end = { x: 115, y: 95 };
    const oneStep = moveCircleWithObstacles(start, end, 10, [obstacle], bounds);
    let partitioned = start;

    for (let step = 0; step < 10; step += 1) {
      partitioned = moveCircleWithObstacles(
        partitioned,
        {
          x: partitioned.x + (end.x - start.x) / 10,
          y: partitioned.y + (end.y - start.y) / 10,
        },
        10,
        [obstacle],
        bounds,
      );
    }

    expect(Math.hypot(oneStep.x - obstacle.x, oneStep.y - obstacle.y))
      .toBeGreaterThanOrEqual(10 - 1e-6);
    expect(oneStep.x).toBeCloseTo(partitioned.x, 4);
    expect(oneStep.y).toBeCloseTo(partitioned.y, 4);
  });

  it('re-sweeps against an adjacent face before a corner slide enters the obstacle', () => {
    const start = { x: 250, y: 250 };
    const end = { x: 120, y: 140 };
    const oneStep = moveCircleWithObstacles(start, end, 10, [obstacle], bounds);
    let partitioned = start;

    for (let step = 0; step < 10; step += 1) {
      partitioned = moveCircleWithObstacles(
        partitioned,
        {
          x: partitioned.x + (end.x - start.x) / 10,
          y: partitioned.y + (end.y - start.y) / 10,
        },
        10,
        [obstacle],
        bounds,
      );
    }

    const closestX = Math.max(obstacle.x, Math.min(oneStep.x, obstacle.x + obstacle.width));
    const closestY = Math.max(obstacle.y, Math.min(oneStep.y, obstacle.y + obstacle.height));

    expect(Math.hypot(oneStep.x - closestX, oneStep.y - closestY))
      .toBeGreaterThanOrEqual(10 - 1e-6);
    expect(oneStep.x).toBeCloseTo(partitioned.x, 4);
    expect(oneStep.y).toBeCloseTo(partitioned.y, 4);
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
    for (const point of obstacles) {
      expect(Math.hypot(result.x - point.x, result.y - point.y))
        .toBeGreaterThanOrEqual(10 - 1e-6);
    }
  });
});
