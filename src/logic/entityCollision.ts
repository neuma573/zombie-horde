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
const MAX_SEPARATION_PASSES = 12;
export const ENTITY_COLLISION_CELL_SIZE = 48;

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

export function separateCircleEntities(
  entities: readonly CircleEntityPosition[],
  obstacles: readonly RectangleObstacle[],
  bounds: Omit<MovementBounds, 'padding'>,
): Map<string, Position> {
  const ordered = [...entities]
    .map((entity) => ({
      ...entity,
      radius: Math.max(0, entity.radius),
      position: { ...entity.position },
      previousPosition: entity.previousPosition ? { ...entity.previousPosition } : undefined,
    }))
    .sort((left, right) => left.id.localeCompare(right.id));

  for (let pass = 0; pass < MAX_SEPARATION_PASSES; pass += 1) {
    let corrected = false;

    for (const { firstIndex, secondIndex } of collisionCandidateIndices(
      ordered,
      ENTITY_COLLISION_CELL_SIZE,
    )) {
      const first = ordered[firstIndex];
      const second = ordered[secondIndex];
      const minimumDistance = first.radius + second.radius;
      const offsetX = second.position.x - first.position.x;
      const offsetY = second.position.y - first.position.y;
      const distance = Math.hypot(offsetX, offsetY);
      const overlap = minimumDistance - distance;

      if (overlap <= OVERLAP_EPSILON || (first.immovable && second.immovable)) continue;

      const normal = separationNormal(first, second, offsetX, offsetY, distance);
      const firstShare = first.immovable ? 0 : second.immovable ? 1 : 0.5;
      const secondShare = second.immovable ? 0 : first.immovable ? 1 : 0.5;

      if (firstShare > 0) {
        const desired = {
          x: first.position.x - normal.x * overlap * firstShare,
          y: first.position.y - normal.y * overlap * firstShare,
        };
        first.position = constrainedPosition(
          first.position,
          desired,
          first.radius,
          obstacles,
          bounds,
        );
      }

      if (secondShare > 0) {
        const desired = {
          x: second.position.x + normal.x * overlap * secondShare,
          y: second.position.y + normal.y * overlap * secondShare,
        };
        second.position = constrainedPosition(
          second.position,
          desired,
          second.radius,
          obstacles,
          bounds,
        );
      }

      corrected = true;
    }

    if (!corrected) break;
  }

  return new Map(ordered.map((entity) => [entity.id, { ...entity.position }]));
}
