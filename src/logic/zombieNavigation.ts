import type { PathfindingConfig } from '../config/pathfindingConfig';
import type { Position } from './movement';
import type { RectangleObstacle } from './obstacleCollision';
import {
  findWorldPath,
  hasDirectPath,
  worldToGridCell,
  type GridCell,
  type PathfindingGrid,
} from './pathfinding';

export interface ZombieNavigationState {
  waypoints: Position[];
  waypointIndex: number;
  pathOrigin: Position | null;
  goalCell: GridCell | null;
  replanRemainingMs: number;
}

export interface ZombieNavigationResult {
  state: ZombieNavigationState;
  target: Position;
  mode: 'direct' | 'path';
  pathCalculated: boolean;
}

export function createZombieNavigationState(): ZombieNavigationState {
  return {
    waypoints: [],
    waypointIndex: 0,
    pathOrigin: null,
    goalCell: null,
    replanRemainingMs: 0,
  };
}

function cellsEqual(first: GridCell | null, second: GridCell): boolean {
  return first?.column === second.column && first.row === second.row;
}

function distanceToSegment(point: Position, start: Position, end: Position): number {
  const deltaX = end.x - start.x;
  const deltaY = end.y - start.y;
  const lengthSquared = deltaX * deltaX + deltaY * deltaY;
  if (lengthSquared <= 1e-9) return Math.hypot(point.x - end.x, point.y - end.y);
  const progress = Math.min(1, Math.max(0, (
    (point.x - start.x) * deltaX + (point.y - start.y) * deltaY
  ) / lengthSquared));
  return Math.hypot(
    point.x - (start.x + deltaX * progress),
    point.y - (start.y + deltaY * progress),
  );
}

function hasDirectPathToContactRange(
  start: Position,
  target: Position,
  contactRange: number,
  obstacles: readonly RectangleObstacle[],
  clearance: number,
): boolean {
  const distance = Math.hypot(target.x - start.x, target.y - start.y);
  const safeContactRange = Number.isFinite(contactRange) ? Math.max(0, contactRange) : 0;
  if (distance <= safeContactRange) return true;
  const travelRatio = (distance - safeContactRange) / distance;
  return hasDirectPath(
    start,
    {
      x: start.x + (target.x - start.x) * travelRatio,
      y: start.y + (target.y - start.y) * travelRatio,
    },
    obstacles,
    clearance,
  );
}

export function updateZombieNavigation(
  previous: ZombieNavigationState,
  zombie: Position,
  player: Position,
  grid: PathfindingGrid,
  obstacles: readonly RectangleObstacle[],
  zombieRadius: number,
  playerRadius: number,
  config: PathfindingConfig,
  deltaMs: number,
): ZombieNavigationResult {
  const safeZombieRadius = Number.isFinite(zombieRadius) ? Math.max(0, zombieRadius) : 0;
  const safePlayerRadius = Number.isFinite(playerRadius) ? Math.max(0, playerRadius) : 0;
  const clearance = safeZombieRadius + config.obstacleClearance;
  const replanRemainingMs = Math.max(
    0,
    previous.replanRemainingMs - Math.max(0, Number.isFinite(deltaMs) ? deltaMs : 0),
  );
  if (hasDirectPathToContactRange(
    zombie,
    player,
    safeZombieRadius + safePlayerRadius,
    obstacles,
    clearance,
  )) {
    return {
      state: {
        waypoints: [],
        waypointIndex: 0,
        pathOrigin: null,
        goalCell: null,
        replanRemainingMs,
      },
      target: { ...player },
      mode: 'direct',
      pathCalculated: false,
    };
  }

  let waypoints = previous.waypoints.map((point) => ({ ...point }));
  let waypointIndex = previous.waypointIndex;
  let pathOrigin = previous.pathOrigin ? { ...previous.pathOrigin } : null;
  while (
    waypointIndex < waypoints.length
    && Math.hypot(
      waypoints[waypointIndex].x - zombie.x,
      waypoints[waypointIndex].y - zombie.y,
    ) <= config.waypointReachDistance
  ) {
    waypointIndex += 1;
  }

  const goalCell = worldToGridCell(grid, player);
  const currentWaypoint = waypoints[waypointIndex];
  const pathExhausted = !currentWaypoint;
  const deviated = currentWaypoint
    ? distanceToSegment(
      zombie,
      waypointIndex > 0 ? waypoints[waypointIndex - 1] : pathOrigin ?? zombie,
      currentWaypoint,
    ) > config.maximumPathDeviation
    : false;
  const pathInvalid = currentWaypoint
    ? !hasDirectPath(zombie, currentWaypoint, obstacles, clearance)
    : false;
  const shouldReplan = replanRemainingMs <= 0 && (
    pathExhausted
    || deviated
    || pathInvalid
    || !cellsEqual(previous.goalCell, goalCell)
  );
  let pathCalculated = false;
  let nextReplanRemainingMs = replanRemainingMs;

  if (shouldReplan) {
    waypoints = findWorldPath(
      grid,
      zombie,
      player,
      obstacles,
      clearance,
      { allowDiagonal: config.allowDiagonal },
    ) ?? [];
    waypointIndex = 0;
    pathOrigin = { ...zombie };
    pathCalculated = true;
    nextReplanRemainingMs = config.replanIntervalMs;
  }

  return {
    state: {
      waypoints,
      waypointIndex,
      pathOrigin,
      goalCell,
      replanRemainingMs: nextReplanRemainingMs,
    },
    target: waypoints[waypointIndex] ?? player,
    mode: waypoints[waypointIndex] ? 'path' : 'direct',
    pathCalculated,
  };
}
