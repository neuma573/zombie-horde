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

export function firstRayRectangleIntersection(
  origin: Vector2,
  direction: Vector2,
  blocker: HitscanBlocker,
): number | undefined {
  const directionLength = Math.hypot(direction.x, direction.y);
  if (directionLength < DIRECTION_EPSILON) return undefined;

  const normalized = {
    x: direction.x / directionLength,
    y: direction.y / directionLength,
  };
  const oppositeX = blocker.x + blocker.width;
  const oppositeY = blocker.y + blocker.height;
  const left = Math.min(blocker.x, oppositeX);
  const right = Math.max(blocker.x, oppositeX);
  const top = Math.min(blocker.y, oppositeY);
  const bottom = Math.max(blocker.y, oppositeY);
  let near = 0;
  let far = Number.POSITIVE_INFINITY;

  for (const axis of [
    { origin: origin.x, direction: normalized.x, min: left, max: right },
    { origin: origin.y, direction: normalized.y, min: top, max: bottom },
  ]) {
    if (Math.abs(axis.direction) < DIRECTION_EPSILON) {
      if (axis.origin < axis.min || axis.origin > axis.max) return undefined;
      continue;
    }

    const first = (axis.min - axis.origin) / axis.direction;
    const second = (axis.max - axis.origin) / axis.direction;
    near = Math.max(near, Math.min(first, second));
    far = Math.min(far, Math.max(first, second));

    if (near > far) return undefined;
  }

  return far >= 0 ? near : undefined;
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
  const blockerDistance = blockers.reduce((nearest, blocker) => {
    const distance = firstRayRectangleIntersection(origin, normalizedDirection, blocker);
    return distance === undefined ? nearest : Math.min(nearest, distance);
  }, Math.max(0, range));
  const candidates = targets.flatMap<HitscanHit>((target) => {
    const distance = firstRayCircleIntersection(origin, normalizedDirection, target);

    if (distance === undefined || distance > range || distance >= blockerDistance) {
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
  const targetEndDistance = reachedTargetLimit ? hits[hits.length - 1].distance : range;
  const endDistance = Math.min(targetEndDistance, blockerDistance);

  return {
    hits,
    endPoint: pointAlongRay(origin, normalizedDirection, endDistance),
  };
}
