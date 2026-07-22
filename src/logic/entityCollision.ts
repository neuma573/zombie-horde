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
export const ENTITY_SEPARATION_CHECKS_PER_SECOND = 300_000;
export const ENTITY_SEPARATION_MAX_CHECKS_PER_FRAME = 15_000;

export interface EntitySeparationWorkBudget {
  pairChecks: number;
  remainingCredit: number;
}

export function entitySeparationWorkBudget(
  deltaMs: number,
  carriedCredit = 0,
  checksPerSecond = ENTITY_SEPARATION_CHECKS_PER_SECOND,
  maxChecksPerFrame = ENTITY_SEPARATION_MAX_CHECKS_PER_FRAME,
): EntitySeparationWorkBudget {
  const safeDeltaMs = Number.isFinite(deltaMs) ? Math.max(0, deltaMs) : 0;
  const safeCredit = Number.isFinite(carriedCredit) ? Math.max(0, carriedCredit) : 0;
  const safeRate = Number.isFinite(checksPerSecond) ? Math.max(0, checksPerSecond) : 0;
  const safeMaximum = Number.isFinite(maxChecksPerFrame)
    ? Math.max(0, Math.floor(maxChecksPerFrame))
    : 0;
  const available = Math.min(
    safeMaximum,
    safeCredit + safeRate * safeDeltaMs / 1_000,
  );
  const pairChecks = Math.floor(available);

  return {
    pairChecks,
    remainingCredit: available - pairChecks,
  };
}

export interface CircleSeparationResult {
  positions: Map<string, Position>;
  pairChecks: number;
  complete: boolean;
  nextCandidateCursor: CircleCandidateCursor;
}

export interface CircleSeparationOptions {
  maxPairChecks?: number;
  startCandidateCursor?: CircleCandidateCursor;
}

export interface CircleCandidateCursor {
  firstIndex: number;
  neighborCellOffset: number;
  occupantOffset: number;
  passHadOverlap: boolean;
  passMadeProgress: boolean;
}

interface IndexedPair {
  firstIndex: number;
  secondIndex: number;
}

function cellKey(x: number, y: number): string {
  return `${x},${y}`;
}

function initialCandidateCursor(): CircleCandidateCursor {
  return {
    firstIndex: 0,
    neighborCellOffset: 0,
    occupantOffset: 0,
    passHadOverlap: false,
    passMadeProgress: false,
  };
}

function isAtCandidatePassStart(cursor: CircleCandidateCursor): boolean {
  return cursor.firstIndex === 0
    && cursor.neighborCellOffset === 0
    && cursor.occupantOffset === 0
    && !cursor.passHadOverlap
    && !cursor.passMadeProgress;
}

function firstIndexGreaterThan(indices: readonly number[], value: number): number {
  let low = 0;
  let high = indices.length;

  while (low < high) {
    const middle = Math.floor((low + high) / 2);
    if (indices[middle] <= value) low = middle + 1;
    else high = middle;
  }

  return low;
}

interface StreamedCandidate {
  pair: IndexedPair;
  nextCursor: Pick<
    CircleCandidateCursor,
    'firstIndex' | 'neighborCellOffset' | 'occupantOffset'
  >;
}

function* streamCollisionCandidateIndices(
  entities: readonly CircleEntityPosition[],
  cellSize: number,
  cursor: CircleCandidateCursor,
): Generator<StreamedCandidate> {
  const safeCellSize = Math.max(1, cellSize);
  const maximumRadius = entities.reduce(
    (maximum, entity) => Math.max(maximum, Math.max(0, entity.radius)),
    0,
  );
  const grid = new Map<string, number[]>();

  entities.forEach((entity, index) => {
    const key = cellKey(
      Math.floor(entity.position.x / safeCellSize),
      Math.floor(entity.position.y / safeCellSize),
    );
    const occupants = grid.get(key);
    if (occupants) occupants.push(index);
    else grid.set(key, [index]);
  });

  for (let firstIndex = cursor.firstIndex; firstIndex < entities.length; firstIndex += 1) {
    const entity = entities[firstIndex];
    const cellX = Math.floor(entity.position.x / safeCellSize);
    const cellY = Math.floor(entity.position.y / safeCellSize);
    const neighborRange = Math.max(
      1,
      Math.ceil((Math.max(0, entity.radius) + maximumRadius) / safeCellSize),
    );
    const rowWidth = neighborRange * 2 + 1;
    const neighborCellCount = rowWidth * rowWidth;
    const firstCellOffset = firstIndex === cursor.firstIndex
      ? Math.min(cursor.neighborCellOffset, neighborCellCount)
      : 0;

    for (
      let neighborCellOffset = firstCellOffset;
      neighborCellOffset < neighborCellCount;
      neighborCellOffset += 1
    ) {
      const offsetX = neighborCellOffset % rowWidth - neighborRange;
      const offsetY = Math.floor(neighborCellOffset / rowWidth) - neighborRange;
      const occupants = grid.get(cellKey(cellX + offsetX, cellY + offsetY)) ?? [];
      const eligibleStart = firstIndexGreaterThan(occupants, firstIndex);
      const firstOccupantOffset = firstIndex === cursor.firstIndex
        && neighborCellOffset === firstCellOffset
        ? cursor.occupantOffset
        : 0;

      for (
        let occupantOffset = firstOccupantOffset;
        eligibleStart + occupantOffset < occupants.length;
        occupantOffset += 1
      ) {
        const hasMoreOccupants = eligibleStart + occupantOffset + 1 < occupants.length;
        const nextCursor = hasMoreOccupants
          ? { firstIndex, neighborCellOffset, occupantOffset: occupantOffset + 1 }
          : neighborCellOffset + 1 < neighborCellCount
            ? { firstIndex, neighborCellOffset: neighborCellOffset + 1, occupantOffset: 0 }
            : { firstIndex: firstIndex + 1, neighborCellOffset: 0, occupantOffset: 0 };

        yield {
          pair: { firstIndex, secondIndex: occupants[eligibleStart + occupantOffset] },
          nextCursor,
        };
      }
    }
  }
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
  let candidateCursor: CircleCandidateCursor = options.startCandidateCursor
    ? {
      firstIndex: Math.max(0, Math.floor(options.startCandidateCursor.firstIndex)),
      neighborCellOffset: Math.max(
        0,
        Math.floor(options.startCandidateCursor.neighborCellOffset),
      ),
      occupantOffset: Math.max(0, Math.floor(options.startCandidateCursor.occupantOffset)),
      passHadOverlap: options.startCandidateCursor.passHadOverlap,
      passMadeProgress: options.startCandidateCursor.passMadeProgress,
    }
    : initialCandidateCursor();

  while (pairChecks < pairCheckBudget) {
    // Keep at least one check available for the actual separation pass. With a
    // one-check budget, pre-counting the first candidate would otherwise consume
    // all work while leaving the cursor at the pass start forever.
    if (
      isAtCandidatePassStart(candidateCursor)
      && pairCheckBudget - pairChecks > 1
    ) {
      const checksBeforeCounting = pairChecks;
      const maximumCount = Math.floor((pairCheckBudget - pairChecks) / 2);
      const counter = streamCollisionCandidateIndices(
        ordered,
        ENTITY_COLLISION_CELL_SIZE,
        candidateCursor,
      );
      let candidateCount = 0;
      let countedFullPass = false;

      while (candidateCount <= maximumCount) {
        const next = counter.next();
        if (next.done) {
          countedFullPass = true;
          break;
        }
        candidateCount += 1;
        pairChecks += 1;
      }

      // Preserve pass ordering for normal crowds. Only a pass that cannot fit
      // in an otherwise empty frame is split and resumed with the cursor.
      if (!countedFullPass && checksBeforeCounting > 0) break;
    }

    const candidates = streamCollisionCandidateIndices(
      ordered,
      ENTITY_COLLISION_CELL_SIZE,
      candidateCursor,
    );
    let completedPass = true;

    for (const { pair: { firstIndex, secondIndex }, nextCursor } of candidates) {
      if (pairChecks >= pairCheckBudget) {
        completedPass = false;
        break;
      }
      pairChecks += 1;

      const first = ordered[firstIndex];
      const second = ordered[secondIndex];
      const minimumDistance = first.radius + second.radius;
      const offsetX = second.position.x - first.position.x;
      const offsetY = second.position.y - first.position.y;
      const distance = Math.hypot(offsetX, offsetY);
      const overlap = minimumDistance - distance;

      const foundOverlap = overlap > OVERLAP_EPSILON;
      let madeProgress = false;

      if (foundOverlap && !(first.immovable && second.immovable)) {
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

        madeProgress = movedDistance > OVERLAP_EPSILON;
      }

      candidateCursor = {
        ...nextCursor,
        passHadOverlap: candidateCursor.passHadOverlap || foundOverlap,
        passMadeProgress: candidateCursor.passMadeProgress || madeProgress,
      };
    }

    if (!completedPass) break;

    if (!candidateCursor.passHadOverlap) {
      complete = true;
      candidateCursor = initialCandidateCursor();
      break;
    }

    // Rebuild the spatial grid only while at least one pair made real progress.
    // Geometry-blocked overlaps stop immediately; budget exhaustion carries
    // remaining work into the next rendered frame.
    if (!candidateCursor.passMadeProgress) {
      candidateCursor = initialCandidateCursor();
      break;
    }

    candidateCursor = initialCandidateCursor();
  }

  return {
    positions: new Map(ordered.map((entity) => [entity.id, { ...entity.position }])),
    pairChecks,
    complete,
    nextCandidateCursor: candidateCursor,
  };
}

export function separateCircleEntities(
  entities: readonly CircleEntityPosition[],
  obstacles: readonly RectangleObstacle[],
  bounds: Omit<MovementBounds, 'padding'>,
): Map<string, Position> {
  return separateCircleEntitiesWithinBudget(entities, obstacles, bounds).positions;
}
