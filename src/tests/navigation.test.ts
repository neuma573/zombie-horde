import { describe, expect, it } from 'vitest';

import { MVP_CONFIG } from '../config/mvpConfig';
import { ZOMBIE_CONFIG } from '../config/zombieConfig';
import {
  cellCenter,
  cellIndexAt,
  createNavigationFlowField,
  createNavigationGrid,
  hasClearPath,
  moveAlongNavigationFlow,
  navigationPathAlongFlow,
} from '../logic/navigation';
import { moveCircleWithObstacles } from '../logic/obstacleCollision';
import { moveToward } from '../logic/movement';
import { getEdgeSpawnPosition } from '../logic/spawn';

const wall = { x: 120, y: 0, width: 40, height: 160 };
const grid = createNavigationGrid(280, 240, 40, 20, [wall]);
const player = { x: 220, y: 60 };

describe('shared zombie navigation flow', () => {
  it('marks cells using zombie clearance around structures', () => {
    expect(grid.blocked[cellIndexAt(grid, { x: 140, y: 60 })]).toBe(true);
    expect(grid.blocked[cellIndexAt(grid, { x: 100, y: 60 })]).toBe(true);
    expect(grid.blocked[cellIndexAt(grid, { x: 60, y: 60 })]).toBe(false);
  });

  it('routes a zombie around a wall instead of stopping in front of it', () => {
    const flow = createNavigationFlowField(grid, player);
    const result = moveAlongNavigationFlow(grid, flow, { x: 60, y: 60 }, player, 600);

    expect(result.x).toBeCloseTo(player.x);
    expect(result.y).toBeCloseTo(player.y);
  });

  it('recovers from the blocked grid cell at an obstacle contact boundary', () => {
    const flow = createNavigationFlowField(grid, player);
    const contactPosition = { x: 100, y: 60 };

    expect(grid.blocked[cellIndexAt(grid, contactPosition)]).toBe(true);

    const recovered = moveAlongNavigationFlow(grid, flow, contactPosition, player, 40);
    expect(recovered).toEqual({ x: 60, y: 60 });

    const result = moveAlongNavigationFlow(grid, flow, recovered, player, 600);
    expect(result.x).toBeCloseTo(player.x);
    expect(result.y).toBeCloseTo(player.y);
  });

  it('keeps pursuing after direct movement reaches an obstacle', () => {
    const flow = createNavigationFlowField(grid, player);
    const start = { x: 40, y: 60 };
    let position = start;

    for (let frame = 0; frame < 600; frame += 1) {
      const desired = hasClearPath(position, player, 20, [wall])
        ? moveToward(position, player, 80, 1_000 / 60)
        : moveAlongNavigationFlow(grid, flow, position, player, 80 / 60);
      position = moveCircleWithObstacles(
        position,
        desired,
        20,
        [wall],
        { width: 280, height: 240, padding: 20 },
      );
    }

    expect(position.x).toBeCloseTo(player.x);
    expect(position.y).toBeCloseTo(player.y);
  });

  it('uses direct pursuit only when zombie clearance does not cross a structure', () => {
    expect(hasClearPath({ x: 40, y: 200 }, { x: 240, y: 200 }, 20, [wall])).toBe(true);
    expect(hasClearPath({ x: 40, y: 60 }, { x: 240, y: 60 }, 20, [wall])).toBe(false);
  });

  it('keeps direct pursuit when only the reachable contact area touches a wall', () => {
    const verticalWall = { x: 120, y: 0, width: 40, height: 200 };

    expect(hasClearPath(
      { x: 20, y: 100 },
      { x: 102, y: 100 },
      20,
      [verticalWall],
      38,
    )).toBe(true);
    expect(hasClearPath(
      { x: 20, y: 100 },
      { x: 178, y: 100 },
      20,
      [verticalWall],
      38,
    )).toBe(false);
  });

  it('uses diagonal flow distance in open space', () => {
    const openGrid = createNavigationGrid(200, 200, 40, 10, []);
    const target = { x: 140, y: 140 };
    const flow = createNavigationFlowField(openGrid, target);

    expect(flow.distances[cellIndexAt(openGrid, { x: 60, y: 60 })])
      .toBeCloseTo(2 * Math.SQRT2);
  });

  it('does not cut diagonally through blocked corners', () => {
    const cornerGrid = createNavigationGrid(
      120,
      120,
      40,
      0,
      [
        { x: 40, y: 0, width: 40, height: 40 },
        { x: 0, y: 40, width: 40, height: 40 },
      ],
    );
    const target = { x: 100, y: 100 };
    const flow = createNavigationFlowField(cornerGrid, target);

    expect(flow.distances[cellIndexAt(cornerGrid, { x: 20, y: 20 })]).toBe(-1);
  });

  it('chooses the approach cell on the player side when the player hugs a wall', () => {
    const wallGrid = createNavigationGrid(
      240,
      200,
      40,
      20,
      [{ x: 120, y: 0, width: 40, height: 200 }],
    );
    const playerAgainstLeftSide = { x: 102, y: 100 };
    const flow = createNavigationFlowField(wallGrid, playerAgainstLeftSide);
    const targetCenter = cellCenter(wallGrid, flow.targetIndex);

    expect(wallGrid.blocked[cellIndexAt(wallGrid, playerAgainstLeftSide)]).toBe(true);
    expect(targetCenter.x).toBeLessThan(120);
    expect(flow.distances[cellIndexAt(wallGrid, { x: 20, y: 100 })]).toBeGreaterThan(0);
    expect(flow.distances[cellIndexAt(wallGrid, { x: 220, y: 100 })]).toBe(-1);
  });

  it('reaches the player in the review scenario across a vertical structure', () => {
    const cityGrid = createNavigationGrid(
      800,
      1_400,
      40,
      20,
      [{ x: 500, y: 800, width: 100, height: 400 }],
    );
    const target = { x: 650, y: 1_000 };
    const flow = createNavigationFlowField(cityGrid, target);
    const result = moveAlongNavigationFlow(
      cityGrid,
      flow,
      { x: 450, y: 1_000 },
      target,
      1_200,
    );

    expect(result.x).toBeCloseTo(target.x);
    expect(result.y).toBeCloseTo(target.y);
  });

  it('produces the same result when travel distance is partitioned', () => {
    const flow = createNavigationFlowField(grid, player);
    const start = { x: 60, y: 60 };
    const oneStep = moveAlongNavigationFlow(grid, flow, start, player, 240);
    let partitioned = start;

    for (let step = 0; step < 4; step += 1) {
      partitioned = moveAlongNavigationFlow(grid, flow, partitioned, player, 60);
    }

    expect(partitioned.x).toBeCloseTo(oneStep.x);
    expect(partitioned.y).toBeCloseTo(oneStep.y);
  });

  it('preserves waypoint segments when collision is applied after a large delta', () => {
    const flow = createNavigationFlowField(grid, player);
    const start = { x: 60, y: 60 };
    const movementBounds = { width: 280, height: 240, padding: 20 };
    const applyPath = (position: typeof start, distance: number) => (
      navigationPathAlongFlow(grid, flow, position, player, distance)
        .reduce((current, waypoint) => moveCircleWithObstacles(
          current,
          waypoint,
          20,
          [wall],
          movementBounds,
        ), position)
    );
    const path = navigationPathAlongFlow(grid, flow, start, player, 600);
    const oneStep = applyPath(start, 600);
    let partitioned = start;

    for (let step = 0; step < 10; step += 1) {
      partitioned = applyPath(partitioned, 60);
    }

    expect(path.length).toBeGreaterThan(2);
    expect(oneStep.x).toBeCloseTo(partitioned.x);
    expect(oneStep.y).toBeCloseTo(partitioned.y);
    expect(oneStep.x).toBeCloseTo(player.x);
    expect(oneStep.y).toBeCloseTo(player.y);
  });

  it('returns no movement for a disconnected zombie cell', () => {
    const sealedGrid = createNavigationGrid(
      200,
      120,
      40,
      10,
      [{ x: 80, y: 0, width: 40, height: 120 }],
    );
    const target = { x: 160, y: 60 };
    const flow = createNavigationFlowField(sealedGrid, target);
    const start = { x: 40, y: 60 };

    expect(moveAlongNavigationFlow(sealedGrid, flow, start, target, 100)).toEqual(start);
  });

  it('moves zombies from every real map spawn toward the player', () => {
    const actualGrid = createNavigationGrid(
      MVP_CONFIG.map.width,
      MVP_CONFIG.map.height,
      MVP_CONFIG.map.navigationCellSize,
      ZOMBIE_CONFIG.radius,
      MVP_CONFIG.map.obstacles,
    );
    const actualPlayer = {
      x: MVP_CONFIG.map.width / 2,
      y: MVP_CONFIG.map.height / 2,
    };
    const flow = createNavigationFlowField(actualGrid, actualPlayer);

    for (let spawnIndex = 0; spawnIndex < 4; spawnIndex += 1) {
      const start = getEdgeSpawnPosition(
        spawnIndex,
        MVP_CONFIG.map,
        ZOMBIE_CONFIG.radius,
        actualPlayer,
        MVP_CONFIG.spawn.minPlayerDistance,
      );
      let result = start;
      for (let frame = 0; frame < 600; frame += 1) {
        const desired = moveAlongNavigationFlow(
          actualGrid,
          flow,
          result,
          actualPlayer,
          ZOMBIE_CONFIG.speed / 60,
        );
        result = moveCircleWithObstacles(
          result,
          desired,
          ZOMBIE_CONFIG.radius,
          MVP_CONFIG.map.obstacles,
          { ...MVP_CONFIG.map, padding: ZOMBIE_CONFIG.radius },
        );
      }

      expect(Math.hypot(result.x - actualPlayer.x, result.y - actualPlayer.y))
        .toBeLessThan(Math.hypot(start.x - actualPlayer.x, start.y - actualPlayer.y));
    }
  });
});
