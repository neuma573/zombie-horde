import { describe, expect, it } from 'vitest';

import { PATHFINDING_CONFIG } from '../config/pathfindingConfig';
import { ZOMBIE_CONFIG } from '../config/zombieConfig';
import { ZOMBIE_CROWD_SPACING_CONFIG } from '../config/zombieCrowdSpacingConfig';
import { URBAN_MAP_CONFIG } from '../config/urbanMapConfig';
import { moveCircleWithObstacles, type RectangleObstacle } from '../logic/obstacleCollision';
import { createPathfindingGrid } from '../logic/pathfinding';
import {
  moveZombieWithCrowdSpacing,
  resolveZombieCrowdSpacing,
  zombieVelocityWithCrowdSpacing,
} from '../logic/zombieCrowdSpacing';
import { queryZombieCollisionCandidates } from '../logic/zombieSpatialGrid';
import { getOffscreenEdgeSpawnPosition } from '../logic/spawn';
import {
  createZombieNavigationState,
  updateZombieNavigation,
  type ZombieNavigationState,
} from '../logic/zombieNavigation';
import type { Position } from '../logic/movement';

interface SimulationResult {
  position: Position;
  elapsedMs: number;
  pathCalculations: number;
}

const bounds = { width: 800, height: 600 };
const stepMs = 1_000 / 60;

function simulate(
  obstacles: readonly RectangleObstacle[],
  initialZombie: Position,
  playerAt: (elapsedMs: number) => Position,
  maximumMs = 30_000,
): SimulationResult {
  const grid = createPathfindingGrid(bounds, obstacles, {
    cellSize: PATHFINDING_CONFIG.cellSize,
    clearance: ZOMBIE_CONFIG.radius + PATHFINDING_CONFIG.obstacleClearance,
  });
  let position = { ...initialZombie };
  let state: ZombieNavigationState = createZombieNavigationState();
  let pathCalculations = 0;

  for (let elapsedMs = 0; elapsedMs <= maximumMs; elapsedMs += stepMs) {
    const player = playerAt(elapsedMs);
    if (Math.hypot(player.x - position.x, player.y - position.y) <= 32) {
      return { position, elapsedMs, pathCalculations };
    }
    const navigation = updateZombieNavigation(
      state,
      position,
      player,
      grid,
      obstacles,
      ZOMBIE_CONFIG.radius,
      PATHFINDING_CONFIG,
      stepMs,
    );
    state = navigation.state;
    if (navigation.pathCalculated) pathCalculations += 1;
    const velocity = zombieVelocityWithCrowdSpacing(
      position,
      navigation.target,
      ZOMBIE_CONFIG.speed,
      { x: 0, y: 0 },
    );
    const desired = moveZombieWithCrowdSpacing(
      position,
      navigation.target,
      velocity,
      stepMs,
    );
    position = moveCircleWithObstacles(
      position,
      desired,
      ZOMBIE_CONFIG.radius,
      obstacles,
      { ...bounds, padding: ZOMBIE_CONFIG.radius },
    );
  }

  return { position, elapsedMs: maximumMs, pathCalculations };
}

describe('zombie pathfinding movement scenarios', () => {
  it.each([
    {
      name: 'a long single wall',
      obstacles: [{ x: 360, y: 80, width: 50, height: 380 }],
      zombie: { x: 180, y: 260 },
      player: { x: 620, y: 260 },
      expectsPath: true,
    },
    {
      name: 'multiple parallel walls with alternating gaps',
      obstacles: [
        { x: 180, y: 20, width: 40, height: 360 },
        { x: 400, y: 220, width: 40, height: 360 },
        { x: 620, y: 20, width: 40, height: 360 },
      ],
      zombie: { x: 60, y: 520 },
      player: { x: 760, y: 520 },
      expectsPath: true,
    },
    {
      name: 'an L-shaped obstacle',
      obstacles: [
        { x: 280, y: 160, width: 280, height: 40 },
        { x: 280, y: 160, width: 40, height: 280 },
      ],
      zombie: { x: 400, y: 280 },
      player: { x: 180, y: 280 },
      expectsPath: true,
    },
    {
      name: 'a narrow corridor',
      obstacles: [
        { x: 200, y: 0, width: 400, height: 210 },
        { x: 200, y: 390, width: 400, height: 210 },
      ],
      zombie: { x: 100, y: 300 },
      player: { x: 700, y: 300 },
      expectsPath: false,
    },
    {
      name: 'several rectangular obstacles',
      obstacles: [
        { x: 180, y: 80, width: 100, height: 220 },
        { x: 360, y: 280, width: 100, height: 240 },
        { x: 540, y: 80, width: 100, height: 220 },
      ],
      zombie: { x: 80, y: 120 },
      player: { x: 720, y: 480 },
      expectsPath: true,
    },
  ])('reaches the player around $name', ({ obstacles, zombie, player, expectsPath }) => {
    const result = simulate(obstacles, zombie, () => player);

    expect(
      Math.hypot(result.position.x - player.x, result.position.y - player.y),
      JSON.stringify(result),
    )
      .toBeLessThanOrEqual(32);
    expect(result.elapsedMs).toBeLessThan(30_000);
    if (expectsPath) expect(result.pathCalculations).toBeGreaterThan(0);
  });

  it('replans when the player moves to the other side of a wall', () => {
    const obstacles = [{ x: 360, y: 80, width: 50, height: 380 }];
    const playerAt = (elapsedMs: number) => (
      elapsedMs < 2_000 ? { x: 340, y: 260 } : { x: 620, y: 260 }
    );
    const result = simulate(obstacles, { x: 120, y: 260 }, playerAt);
    const finalPlayer = playerAt(result.elapsedMs);

    expect(Math.hypot(result.position.x - finalPlayer.x, result.position.y - finalPlayer.y))
      .toBeLessThanOrEqual(32);
    expect(result.pathCalculations).toBeGreaterThan(0);
  });

  it('reaches a player hugging the opposite face of a wall', () => {
    const obstacles = [{ x: 360, y: 80, width: 50, height: 380 }];
    const player = { x: 360 - 18, y: 260 };
    const result = simulate(obstacles, { x: 620, y: 260 }, () => player);

    expect(
      Math.hypot(result.position.x - player.x, result.position.y - player.y),
      JSON.stringify(result),
    ).toBeLessThanOrEqual(32);
    expect(result.elapsedMs).toBeLessThan(30_000);
    expect(result.pathCalculations).toBeGreaterThan(0);
  });

  it('lets several zombies independently follow the same route', () => {
    const obstacles = [{ x: 360, y: 80, width: 50, height: 380 }];
    const player = { x: 620, y: 260 };
    const starts = [
      { x: 120, y: 220 },
      { x: 120, y: 260 },
      { x: 120, y: 300 },
      { x: 160, y: 260 },
    ];
    const results = starts.map((start) => simulate(obstacles, start, () => player));

    expect(results.every((result) => (
      Math.hypot(result.position.x - player.x, result.position.y - player.y) <= 32
    ))).toBe(true);
    expect(results.every((result) => result.elapsedMs < 30_000)).toBe(true);
  });

  it('lets all 50 zombies reach the player when a crowd follows the same wall route', () => {
    const obstacles = [{ x: 360, y: 80, width: 50, height: 380 }];
    const player = { x: 620, y: 260 };
    const grid = createPathfindingGrid(bounds, obstacles, {
      cellSize: PATHFINDING_CONFIG.cellSize,
      clearance: ZOMBIE_CONFIG.radius + PATHFINDING_CONFIG.obstacleClearance,
    });
    const zombies = Array.from({ length: 50 }, (_, index) => ({
      id: `zombie-${index.toString().padStart(2, '0')}`,
      position: {
        x: 80 + index % 10 * 26,
        y: 180 + Math.floor(index / 10) * 34,
      },
      navigation: createZombieNavigationState(),
    }));
    const reached = new Set<string>();

    for (let elapsedMs = 0; elapsedMs <= 30_000; elapsedMs += stepMs) {
      const entries = zombies.map((zombie) => ({
        id: zombie.id,
        position: zombie.position,
        radius: ZOMBIE_CONFIG.radius,
      }));
      const crowdSpacing = resolveZombieCrowdSpacing(
        entries,
        queryZombieCollisionCandidates(entries),
        ZOMBIE_CROWD_SPACING_CONFIG,
        ZOMBIE_CONFIG.speed,
      );
      const nextPositions = new Map<string, Position>();

      for (const zombie of zombies) {
        if (Math.hypot(
          zombie.position.x - player.x,
          zombie.position.y - player.y,
        ) <= 40) {
          reached.add(zombie.id);
        }
        const navigation = updateZombieNavigation(
          zombie.navigation,
          zombie.position,
          player,
          grid,
          obstacles,
          ZOMBIE_CONFIG.radius,
          PATHFINDING_CONFIG,
          stepMs,
        );
        zombie.navigation = navigation.state;
        const velocity = zombieVelocityWithCrowdSpacing(
          zombie.position,
          navigation.target,
          ZOMBIE_CONFIG.speed,
          crowdSpacing.velocities.get(zombie.id) ?? { x: 0, y: 0 },
        );
        const desired = moveZombieWithCrowdSpacing(
          zombie.position,
          navigation.target,
          velocity,
          stepMs,
        );
        nextPositions.set(zombie.id, moveCircleWithObstacles(
          zombie.position,
          desired,
          ZOMBIE_CONFIG.radius,
          obstacles,
          { ...bounds, padding: ZOMBIE_CONFIG.radius },
        ));
      }

      for (const zombie of zombies) {
        zombie.position = nextPositions.get(zombie.id)!;
      }
    }

    expect(
      [...reached].sort(),
      JSON.stringify(zombies.map((zombie) => ({
        id: zombie.id,
        position: zombie.position,
        waypointIndex: zombie.navigation.waypointIndex,
        waypointCount: zombie.navigation.waypoints.length,
      }))),
    ).toEqual(zombies.map((zombie) => zombie.id));
  });

  it('lets zombies from every sampled urban map edge reach the center player', () => {
    const mapBounds = {
      width: URBAN_MAP_CONFIG.width,
      height: URBAN_MAP_CONFIG.height,
    };
    const obstacles = URBAN_MAP_CONFIG.obstacles;
    const player = { x: 2_000, y: 1_500 };
    const padding = ZOMBIE_CONFIG.radius;
    const starts: Position[] = [];
    for (let x = padding; x <= mapBounds.width - padding; x += 128) {
      starts.push({ x, y: padding }, { x, y: mapBounds.height - padding });
    }
    for (let y = padding + 128; y < mapBounds.height - padding; y += 128) {
      starts.push({ x: padding, y }, { x: mapBounds.width - padding, y });
    }
    const grid = createPathfindingGrid(mapBounds, obstacles, {
      cellSize: PATHFINDING_CONFIG.cellSize,
      clearance: ZOMBIE_CONFIG.radius + PATHFINDING_CONFIG.obstacleClearance,
    });
    const failures: Array<{
      start: Position;
      end: Position;
      waypointIndex: number;
      waypointCount: number;
    }> = [];

    for (const start of starts) {
      let position = { ...start };
      let navigation = createZombieNavigationState();
      let reached = false;
      for (let elapsedMs = 0; elapsedMs <= 60_000; elapsedMs += stepMs) {
        if (Math.hypot(position.x - player.x, position.y - player.y) <= 40) {
          reached = true;
          break;
        }
        const update = updateZombieNavigation(
          navigation,
          position,
          player,
          grid,
          obstacles,
          ZOMBIE_CONFIG.radius,
          PATHFINDING_CONFIG,
          stepMs,
        );
        navigation = update.state;
        const velocity = zombieVelocityWithCrowdSpacing(
          position,
          update.target,
          ZOMBIE_CONFIG.speed,
          { x: 0, y: 0 },
        );
        const desired = moveZombieWithCrowdSpacing(
          position,
          update.target,
          velocity,
          stepMs,
        );
        position = moveCircleWithObstacles(
          position,
          desired,
          ZOMBIE_CONFIG.radius,
          obstacles,
          { ...mapBounds, padding },
        );
      }
      if (!reached) {
        failures.push({
          start,
          end: position,
          waypointIndex: navigation.waypointIndex,
          waypointCount: navigation.waypoints.length,
        });
      }
    }

    expect(failures).toEqual([]);
  });

  it('lets 50 runtime-spawned urban-map zombies reach the center player together', () => {
    const mapBounds = {
      width: URBAN_MAP_CONFIG.width,
      height: URBAN_MAP_CONFIG.height,
    };
    const obstacles = URBAN_MAP_CONFIG.obstacles;
    const player = { x: 2_000, y: 1_500 };
    const padding = ZOMBIE_CONFIG.radius;
    const cameraView = { x: 1_550, y: 1_150, width: 900, height: 700 };
    const starts = Array.from({ length: 50 }, (_, index) => (
      getOffscreenEdgeSpawnPosition(
        index,
        mapBounds,
        padding,
        player,
        160,
        cameraView,
        obstacles,
        0x5eed_1234,
      )
    ));
    expect(starts.every((position) => position !== null)).toBe(true);
    const grid = createPathfindingGrid(mapBounds, obstacles, {
      cellSize: PATHFINDING_CONFIG.cellSize,
      clearance: ZOMBIE_CONFIG.radius + PATHFINDING_CONFIG.obstacleClearance,
    });
    const zombies = starts.map((position, index) => ({
      id: `urban-zombie-${index.toString().padStart(2, '0')}`,
      position: { ...position! },
      navigation: createZombieNavigationState(),
    }));
    const reached = new Set<string>();

    for (let elapsedMs = 0; elapsedMs <= 60_000; elapsedMs += stepMs) {
      const entries = zombies.map((zombie) => ({
        id: zombie.id,
        position: zombie.position,
        radius: ZOMBIE_CONFIG.radius,
      }));
      const crowdSpacing = resolveZombieCrowdSpacing(
        entries,
        queryZombieCollisionCandidates(entries),
        ZOMBIE_CROWD_SPACING_CONFIG,
        ZOMBIE_CONFIG.speed,
      );
      const nextPositions = new Map<string, Position>();
      for (const zombie of zombies) {
        if (Math.hypot(
          zombie.position.x - player.x,
          zombie.position.y - player.y,
        ) <= 40) {
          reached.add(zombie.id);
        }
        const update = updateZombieNavigation(
          zombie.navigation,
          zombie.position,
          player,
          grid,
          obstacles,
          ZOMBIE_CONFIG.radius,
          PATHFINDING_CONFIG,
          stepMs,
        );
        zombie.navigation = update.state;
        const velocity = zombieVelocityWithCrowdSpacing(
          zombie.position,
          update.target,
          ZOMBIE_CONFIG.speed,
          crowdSpacing.velocities.get(zombie.id) ?? { x: 0, y: 0 },
        );
        const desired = moveZombieWithCrowdSpacing(
          zombie.position,
          update.target,
          velocity,
          stepMs,
        );
        nextPositions.set(zombie.id, moveCircleWithObstacles(
          zombie.position,
          desired,
          ZOMBIE_CONFIG.radius,
          obstacles,
          { ...mapBounds, padding },
        ));
      }
      for (const zombie of zombies) {
        zombie.position = nextPositions.get(zombie.id)!;
      }
    }

    expect(
      zombies.filter((zombie) => !reached.has(zombie.id)).map((zombie) => ({
        id: zombie.id,
        position: zombie.position,
        waypointIndex: zombie.navigation.waypointIndex,
        waypointCount: zombie.navigation.waypoints.length,
      })),
    ).toEqual([]);
  });
});
