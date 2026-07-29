import { describe, expect, it } from 'vitest';

import {
  createPathfindingGrid,
  findGridPath,
  findWorldPath,
  gridCellCenter,
  hasDirectPath,
  hasGridLineOfSight,
  isGridCellWalkable,
  simplifyWorldPath,
  worldToGridCell,
  type GridCell,
} from '../logic/pathfinding';
import type { RectangleObstacle } from '../logic/obstacleCollision';

const bounds = { width: 400, height: 300 };

function grid(
  obstacles: readonly RectangleObstacle[] = [],
  cellSize = 20,
  clearance = 0,
) {
  return createPathfindingGrid(bounds, obstacles, { cellSize, clearance });
}

function pathBetween(
  obstacles: readonly RectangleObstacle[],
  start: { x: number; y: number },
  goal: { x: number; y: number },
  clearance = 0,
) {
  const navigationGrid = grid(obstacles, 20, clearance);
  return {
    navigationGrid,
    path: findWorldPath(
      navigationGrid,
      start,
      goal,
      obstacles,
      clearance,
      { allowDiagonal: true },
    ),
  };
}

function expectSafeSegments(
  navigationGrid: ReturnType<typeof grid>,
  points: readonly { x: number; y: number }[],
  obstacles: readonly RectangleObstacle[],
  clearance = 0,
): void {
  for (let index = 1; index < points.length; index += 1) {
    expect(hasGridLineOfSight(navigationGrid, points[index - 1], points[index])).toBe(true);
    expect(hasDirectPath(points[index - 1], points[index], obstacles, clearance)).toBe(true);
  }
}

describe('low-resolution pathfinding grid and A*', () => {
  it('creates a path between unobstructed positions', () => {
    const { path } = pathBetween([], { x: 30, y: 30 }, { x: 350, y: 250 });

    expect(path).not.toBeNull();
    expect(path!.length).toBe(1);
  });

  it('routes around a long rectangular wall', () => {
    const obstacles = [{ x: 180, y: 20, width: 40, height: 220 }];
    const start = { x: 80, y: 120 };
    const { navigationGrid, path } = pathBetween(obstacles, start, { x: 320, y: 120 });

    expect(path).not.toBeNull();
    expect(path!.some((point) => point.y < 20 || point.y > 240)).toBe(true);
    expectSafeSegments(navigationGrid, [gridCellCenter(
      navigationGrid,
      worldToGridCell(navigationGrid, start),
    ), ...path!], obstacles);
  });

  it('routes to a collision-valid goal beside an obstacle without crossing it', () => {
    const obstacle = { x: 180, y: 20, width: 40, height: 220 };
    const clearance = 24;
    const { path } = pathBetween(
      [obstacle],
      { x: 320, y: 120 },
      { x: obstacle.x - 18, y: 120 },
      clearance,
    );

    expect(path).not.toBeNull();
    expect(path!.some((point) => point.y < obstacle.y || point.y > obstacle.y + obstacle.height))
      .toBe(true);
    expect(path!.at(-1)!.x).toBeLessThan(obstacle.x);
  });

  it('validates the first waypoint from the actual world start', () => {
    const obstacles = [{ x: 160, y: 80, width: 40, height: 240 }];
    const start = { x: 120, y: 65 };
    const goal = { x: 300, y: 20 };
    const clearance = 20;
    const navigationGrid = grid(obstacles, 64);
    const path = findWorldPath(
      navigationGrid,
      start,
      goal,
      obstacles,
      clearance,
      { allowDiagonal: true },
    );

    expect(hasDirectPath(start, goal, obstacles, clearance)).toBe(false);
    expect(path).not.toBeNull();
    expect(path!.length).toBeGreaterThan(1);
    expect(hasDirectPath(start, path![0], obstacles, clearance)).toBe(true);
  });

  it('finds a route through offset gaps in parallel walls', () => {
    const obstacles = [
      { x: 100, y: 0, width: 20, height: 200 },
      { x: 200, y: 100, width: 20, height: 200 },
      { x: 300, y: 0, width: 20, height: 200 },
    ];
    const { path } = pathBetween(obstacles, { x: 40, y: 250 }, { x: 360, y: 250 });

    expect(path).not.toBeNull();
    expect(path!.length).toBeGreaterThan(1);
  });

  it('routes around the inside and outside faces of an L-shaped obstacle', () => {
    const obstacles = [
      { x: 140, y: 60, width: 140, height: 20 },
      { x: 140, y: 60, width: 20, height: 160 },
    ];
    const { navigationGrid, path } = pathBetween(
      obstacles,
      { x: 200, y: 120 },
      { x: 80, y: 120 },
    );

    expect(path).not.toBeNull();
    expectSafeSegments(
      navigationGrid,
      [gridCellCenter(navigationGrid, { column: 10, row: 6 }), ...path!],
      obstacles,
    );
  });

  it('does not cut diagonally through a blocked corner', () => {
    const navigationGrid = grid([
      { x: 20, y: 0, width: 20, height: 20 },
      { x: 0, y: 20, width: 20, height: 20 },
    ]);
    const path = findGridPath(
      navigationGrid,
      { column: 0, row: 0 },
      { column: 1, row: 1 },
      { allowDiagonal: true },
    );

    expect(path).toBeNull();
  });

  it('blocks cells that overlap zombie-radius obstacle clearance', () => {
    const obstacle = { x: 100, y: 100, width: 20, height: 20 };
    const withoutRadius = grid([obstacle], 20, 0);
    const withRadius = grid([obstacle], 20, 20);

    expect(isGridCellWalkable(withoutRadius, { column: 4, row: 5 })).toBe(true);
    expect(isGridCellWalkable(withRadius, { column: 4, row: 5 })).toBe(false);
    const center = gridCellCenter(withRadius, { column: 4, row: 5 });
    expect(center.x).toBeLessThan(obstacle.x);
  });

  it('terminates normally when a walkable goal is enclosed', () => {
    const obstacles = [
      { x: 120, y: 80, width: 160, height: 20 },
      { x: 120, y: 200, width: 160, height: 20 },
      { x: 120, y: 100, width: 20, height: 100 },
      { x: 260, y: 100, width: 20, height: 100 },
    ];
    const { path } = pathBetween(obstacles, { x: 40, y: 150 }, { x: 200, y: 150 });

    expect(path).toBeNull();
  });

  it('keeps every simplified segment outside obstacles and blocked grid cells', () => {
    const obstacles = [
      { x: 100, y: 40, width: 40, height: 180 },
      { x: 220, y: 80, width: 40, height: 180 },
    ];
    const navigationGrid = grid(obstacles);
    const cells = findGridPath(
      navigationGrid,
      { column: 2, row: 6 },
      { column: 17, row: 6 },
      { allowDiagonal: true },
    )!;
    const raw = cells.map((cell) => gridCellCenter(navigationGrid, cell));
    const simplified = simplifyWorldPath(raw, navigationGrid, obstacles, 0);

    expect(simplified.length).toBeLessThan(raw.length);
    expectSafeSegments(navigationGrid, simplified, obstacles);
  });

  it('reports that direct chase does not need A* when the line is open', () => {
    expect(hasDirectPath(
      { x: 20, y: 20 },
      { x: 380, y: 280 },
      [{ x: 20, y: 240, width: 80, height: 20 }],
      20,
    )).toBe(true);
  });

  it('returns the same path for identical inputs', () => {
    const obstacles = [{ x: 180, y: 40, width: 40, height: 200 }];
    const navigationGrid = grid(obstacles);
    const start: GridCell = { column: 2, row: 7 };
    const goal: GridCell = { column: 17, row: 7 };

    expect(findGridPath(navigationGrid, start, goal, { allowDiagonal: true }))
      .toEqual(findGridPath(navigationGrid, start, goal, { allowDiagonal: true }));
  });
});
