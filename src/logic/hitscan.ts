export interface Vector2 {
  x: number;
  y: number;
}

export interface HitscanTarget {
  id: string;
  position: Vector2;
  radius: number;
}

export interface HitscanHit {
  targetId: string;
  distance: number;
  point: Vector2;
}

export interface HitscanBlocker {
  x: number;
  y: number;
  width: number;
  height: number;
  blocksHitscan: boolean;
}

export interface HitscanResult {
  hits: HitscanHit[];
  endPoint: Vector2;
}

const DIRECTION_EPSILON = 1e-8;

function pointAlongRay(origin: Vector2, direction: Vector2, distance: number): Vector2 {
  return {
    x: origin.x + direction.x * distance,
    y: origin.y + direction.y * distance,
  };
}

function firstRayCircleIntersection(
  origin: Vector2,
  direction: Vector2,
  target: HitscanTarget,
): number | undefined {
  if (target.radius < 0) {
    return undefined;
  }

  const offsetX = origin.x - target.position.x;
  const offsetY = origin.y - target.position.y;
  const distanceFromCenterSquared = offsetX * offsetX + offsetY * offsetY;
  const radiusSquared = target.radius * target.radius;

  if (distanceFromCenterSquared <= radiusSquared) {
    return 0;
  }

  const projection = offsetX * direction.x + offsetY * direction.y;
  const discriminant = projection * projection - (distanceFromCenterSquared - radiusSquared);

  if (discriminant < 0) {
    return undefined;
  }

  const distance = -projection - Math.sqrt(discriminant);
  return distance >= 0 ? distance : undefined;
}

function firstRayRectangleIntersection(
  origin: Vector2,
  direction: Vector2,
  blocker: HitscanBlocker,
): number | undefined {
  const ranges = [
    { origin: origin.x, direction: direction.x, min: blocker.x, max: blocker.x + Math.max(0, blocker.width) },
    { origin: origin.y, direction: direction.y, min: blocker.y, max: blocker.y + Math.max(0, blocker.height) },
  ];
  let entryDistance = Number.NEGATIVE_INFINITY;
  let exitDistance = Number.POSITIVE_INFINITY;

  for (const range of ranges) {
    if (Math.abs(range.direction) < DIRECTION_EPSILON) {
      if (range.origin < range.min || range.origin > range.max) return undefined;
      continue;
    }

    const first = (range.min - range.origin) / range.direction;
    const second = (range.max - range.origin) / range.direction;
    entryDistance = Math.max(entryDistance, Math.min(first, second));
    exitDistance = Math.min(exitDistance, Math.max(first, second));

    if (entryDistance > exitDistance) return undefined;
  }

  if (exitDistance < 0) return undefined;
  return Math.max(0, entryDistance);
}

export function resolveHitscan(
  origin: Vector2,
  direction: Vector2,
  range: number,
  targets: readonly HitscanTarget[],
  maxTargets: number,
  blockers: readonly HitscanBlocker[] = [],
): HitscanResult {
  const directionLength = Math.hypot(direction.x, direction.y);
  const targetLimit = Math.floor(maxTargets);

  if (directionLength < DIRECTION_EPSILON || range <= 0 || targetLimit <= 0) {
    return { hits: [], endPoint: { ...origin } };
  }

  const normalizedDirection = {
    x: direction.x / directionLength,
    y: direction.y / directionLength,
  };
  let blockerDistance: number | undefined;

  for (const blocker of blockers) {
    if (!blocker.blocksHitscan) continue;
    const distance = firstRayRectangleIntersection(origin, normalizedDirection, blocker);

    if (distance === undefined || distance > range) continue;
    blockerDistance = blockerDistance === undefined
      ? distance
      : Math.min(blockerDistance, distance);
  }

  const candidates = targets.flatMap<HitscanHit>((target) => {
    const distance = firstRayCircleIntersection(origin, normalizedDirection, target);

    if (
      distance === undefined
      || distance > range
      || (blockerDistance !== undefined && distance >= blockerDistance)
    ) {
      return [];
    }

    return [{
      targetId: target.id,
      distance,
      point: pointAlongRay(origin, normalizedDirection, distance),
    }];
  });

  candidates.sort((left, right) => {
    if (left.distance !== right.distance) {
      return left.distance - right.distance;
    }

    return left.targetId < right.targetId ? -1 : Number(left.targetId > right.targetId);
  });

  const hits = candidates.slice(0, targetLimit);
  const reachedTargetLimit = hits.length === targetLimit;
  const endDistance = reachedTargetLimit
    ? hits[hits.length - 1].distance
    : blockerDistance ?? range;

  return {
    hits,
    endPoint: pointAlongRay(origin, normalizedDirection, endDistance),
  };
}
