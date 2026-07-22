import {
  moveCircleWithObstacles,
  type RectangleObstacle,
} from './obstacleCollision';
import type { MovementBounds, Position } from './movement';

export interface CircleEntityPosition {
  id: string;
  position: Position;
  previousPosition?: Position;
  radius: number;
  immovable?: boolean;
}

const OVERLAP_EPSILON = 1e-6;
export const ENTITY_COLLISION_CELL_SIZE = 48;
export const ENTITY_SEPARATION_PAIR_CHECK_BUDGET = 5_000;

export interface CircleSeparationResult {
  positions: Map<string, Position>;
  pairChecks: number;
  complete: boolean;
  nextPairOffset: number;
}

export interface CircleSeparationOptions {
  maxPairChecks?: number;
  startPairOffset?: number;
}

interface IndexedPair {
  firstIndex: number;
  secondIndex: number;
}

function cellKey(x: number, y: number): string {
  return `${x},${y}`;
}

function collisionCandidateIndices(
  entities: readonly CircleEntityPosition[],
  cellSize: number,
): IndexedPair[] {
  const safeCellSize = Math.max(1, cellSize);
  const maximumRadius = entities.reduce(
    (maximum, entity) => Math.max(maximum, Math.max(0, entity.radius)),
    0,
  );
  const grid = new Map<string, number[]>();

  entities.forEach((entity, index) => {
    const x = Math.floor(entity.position.x / safeCellSize);
    const y = Math.floor(entity.position.y / safeCellSize);
    const key = cellKey(x, y);
    const occupants = grid.get(key);

    if (occupants) occupants.push(index);
    else grid.set(key, [index]);
  });

  const pairs: IndexedPair[] = [];

  entities.forEach((entity, firstIndex) => {
    const cellX = Math.floor(entity.position.x / safeCellSize);
    const cellY = Math.floor(entity.position.y / safeCellSize);
    const neighborRange = Math.max(
      1,
      Math.ceil((Math.max(0, entity.radius) + maximumRadius) / safeCellSize),
    );

    for (let y = cellY - neighborRange; y <= cellY + neighborRange; y += 1) {
      for (let x = cellX - neighborRange; x <= cellX + neighborRange; x += 1) {
        for (const secondIndex of grid.get(cellKey(x, y)) ?? []) {
          if (secondIndex <= firstIndex) continue;
          pairs.push({ firstIndex, secondIndex });
        }
      }
    }
  });

  return pairs;
}

export function findCircleCollisionCandidatePairs(
  entities: readonly CircleEntityPosition[],
  cellSize = ENTITY_COLLISION_CELL_SIZE,
): Array<readonly [string, string]> {
  const ordered = [...entities].sort((left, right) => left.id.localeCompare(right.id));
  return collisionCandidateIndices(ordered, cellSize).map(({ firstIndex, secondIndex }) => [
    ordered[firstIndex].id,
    ordered[secondIndex].id,
  ] as const);
}

function fallbackNormal(firstId: string, secondId: string): Position {
  let hash = 2166136261;
  const key = `${firstId}:${secondId}`;

  for (let index = 0; index < key.length; index += 1) {
    hash ^= key.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  const angle = (hash >>> 0) / 0xffffffff * Math.PI * 2;
  return { x: Math.cos(angle), y: Math.sin(angle) };
}

function separationNormal(
  first: CircleEntityPosition,
  second: CircleEntityPosition,
  offsetX: number,
  offsetY: number,
  distance: number,
): Position {
  if (distance > OVERLAP_EPSILON) {
    return { x: offsetX / distance, y: offsetY / distance };
  }

  if (first.previousPosition && second.previousPosition) {
    const previousOffsetX = second.previousPosition.x - first.previousPosition.x;
    const previousOffsetY = second.previousPosition.y - first.previousPosition.y;
    const previousDistance = Math.hypot(previousOffsetX, previousOffsetY);

    if (previousDistance > OVERLAP_EPSILON) {
      return {
        x: previousOffsetX / previousDistance,
        y: previousOffsetY / previousDistance,
      };
    }
  }

  return fallbackNormal(first.id, second.id);
}

function constrainedPosition(
  start: Position,
  desiredEnd: Position,
  radius: number,
  obstacles: readonly RectangleObstacle[],
  bounds: Omit<MovementBounds, 'padding'>,
): Position {
  return moveCircleWithObstacles(start, desiredEnd, radius, obstacles, {
    ...bounds,
    padding: Math.max(0, radius),
  });
}

function applySeparationMove(
  entity: CircleEntityPosition,
  normal: Position,
  distance: number,
  direction: -1 | 1,
  obstacles: readonly RectangleObstacle[],
  bounds: Omit<MovementBounds, 'padding'>,
): number {
  if (distance <= OVERLAP_EPSILON) return 0;

  const start = entity.position;
  const desired = {
    x: start.x + normal.x * distance * direction,
    y: start.y + normal.y * distance * direction,
  };
  const resolved = constrainedPosition(
    start,
    desired,
    entity.radius,
    obstacles,
    bounds,
  );
  entity.position = resolved;

  return Math.max(0, (
    (resolved.x - start.x) * normal.x
      + (resolved.y - start.y) * normal.y
  ) * direction);
}

export function separateCircleEntitiesWithinBudget(
  entities: readonly CircleEntityPosition[],
  obstacles: readonly RectangleObstacle[],
  bounds: Omit<MovementBounds, 'padding'>,
  options: CircleSeparationOptions = {},
): CircleSeparationResult {
  const ordered = [...entities]
    .map((entity) => ({
      ...entity,
      radius: Math.max(0, entity.radius),
      position: { ...entity.position },
      previousPosition: entity.previousPosition ? { ...entity.previousPosition } : undefined,
    }))
    .sort((left, right) => left.id.localeCompare(right.id));

  const pairCheckBudget = Math.max(0, Math.floor(
    Number.isFinite(options.maxPairChecks)
      ? options.maxPairChecks!
      : ENTITY_SEPARATION_PAIR_CHECK_BUDGET,
  ));
  let pairChecks = 0;
  let complete = ordered.length < 2;
  let nextPairOffset = Number.isFinite(options.startPairOffset)
    ? Math.max(0, Math.floor(options.startPairOffset!))
    : 0;

  while (pairChecks < pairCheckBudget) {
    const candidates = collisionCandidateIndices(ordered, ENTITY_COLLISION_CELL_SIZE);

    if (candidates.length === 0) {
      complete = true;
      nextPairOffset = 0;
      break;
    }

    const remainingBudget = pairCheckBudget - pairChecks;
    const canCompletePass = candidates.length <= remainingBudget;

    if (!canCompletePass && pairChecks > 0) break;

    const checksThisPass = canCompletePass ? candidates.length : remainingBudget;
    const passStartOffset = canCompletePass ? 0 : nextPairOffset % candidates.length;
    let checkedThisPass = 0;
    let corrected = false;
    let foundOverlap = false;

    while (checkedThisPass < checksThisPass) {
      const { firstIndex, secondIndex } = candidates[
        (passStartOffset + checkedThisPass) % candidates.length
      ];
      checkedThisPass += 1;
      pairChecks += 1;

      const first = ordered[firstIndex];
      const second = ordered[secondIndex];
      const minimumDistance = first.radius + second.radius;
      const offsetX = second.position.x - first.position.x;
      const offsetY = second.position.y - first.position.y;
      const distance = Math.hypot(offsetX, offsetY);
      const overlap = minimumDistance - distance;

      if (overlap <= OVERLAP_EPSILON) continue;
      foundOverlap = true;
      if (first.immovable && second.immovable) continue;

      const normal = separationNormal(first, second, offsetX, offsetY, distance);
      const firstShare = first.immovable ? 0 : second.immovable ? 1 : 0.5;
      const secondShare = second.immovable ? 0 : first.immovable ? 1 : 0.5;
      let movedDistance = 0;

      if (firstShare > 0) {
        movedDistance += applySeparationMove(
          first,
          normal,
          overlap * firstShare,
          -1,
          obstacles,
          bounds,
        );
      }

      if (secondShare > 0) {
        movedDistance += applySeparationMove(
          second,
          normal,
          overlap * secondShare,
          1,
          obstacles,
          bounds,
        );
      }

      let remaining = Math.max(0, overlap - movedDistance);

      // An immovable entity is a priority hint. If its counterpart is blocked by
      // geometry, consume the unresolved overlap on the other side instead.
      if (remaining > OVERLAP_EPSILON) {
        const firstFallback = applySeparationMove(
          first,
          normal,
          remaining,
          -1,
          obstacles,
          bounds,
        );
        movedDistance += firstFallback;
        remaining = Math.max(0, remaining - firstFallback);
      }

      if (remaining > OVERLAP_EPSILON) {
        movedDistance += applySeparationMove(
          second,
          normal,
          remaining,
          1,
          obstacles,
          bounds,
        );
      }

      corrected ||= movedDistance > OVERLAP_EPSILON;
    }

    if (!canCompletePass) {
      nextPairOffset = (passStartOffset + checkedThisPass) % candidates.length;
      break;
    }

    nextPairOffset = 0;
    if (!foundOverlap) {
      complete = true;
      break;
    }

    // Rebuild the spatial grid only while at least one pair made real progress.
    // Geometry-blocked overlaps stop immediately; budget exhaustion carries
    // remaining work into the next rendered frame.
    if (!corrected) break;
  }

  return {
    positions: new Map(ordered.map((entity) => [entity.id, { ...entity.position }])),
    pairChecks,
    complete,
    nextPairOffset,
  };
}

export function separateCircleEntities(
  entities: readonly CircleEntityPosition[],
  obstacles: readonly RectangleObstacle[],
  bounds: Omit<MovementBounds, 'padding'>,
): Map<string, Position> {
  return separateCircleEntitiesWithinBudget(entities, obstacles, bounds).positions;
}
