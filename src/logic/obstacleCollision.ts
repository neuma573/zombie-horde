import { constrainToBounds, type MovementBounds, type Position } from './movement';

export interface RectangleObstacle {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface SweepHit {
  time: number;
  normal: Position;
  obstacleIndex: number;
  face?: {
    axis: 'x' | 'y';
    min: number;
    max: number;
  };
}

const TIME_EPSILON = 1e-7;

function earliest(current: SweepHit | null, candidate: SweepHit | null): SweepHit | null {
  if (!candidate) return current;
  if (!current || candidate.time < current.time) return candidate;
  return current;
}

function validTime(time: number): boolean {
  return Number.isFinite(time) && time >= 0 && time <= 1;
}

function sweepCircleAgainstRectangle(
  start: Position,
  delta: Position,
  radius: number,
  obstacle: RectangleObstacle,
  obstacleIndex: number,
): SweepHit | null {
  const left = obstacle.x;
  const right = obstacle.x + Math.max(0, obstacle.width);
  const top = obstacle.y;
  const bottom = obstacle.y + Math.max(0, obstacle.height);
  let hit: SweepHit | null = null;

  if (delta.x > 0) {
    const time = (left - radius - start.x) / delta.x;
    const y = start.y + delta.y * time;
    if (validTime(time) && y >= top && y <= bottom) {
      hit = earliest(hit, {
        time,
        normal: { x: -1, y: 0 },
        obstacleIndex,
        face: { axis: 'y', min: top, max: bottom },
      });
    }
  } else if (delta.x < 0) {
    const time = (right + radius - start.x) / delta.x;
    const y = start.y + delta.y * time;
    if (validTime(time) && y >= top && y <= bottom) {
      hit = earliest(hit, {
        time,
        normal: { x: 1, y: 0 },
        obstacleIndex,
        face: { axis: 'y', min: top, max: bottom },
      });
    }
  }

  if (delta.y > 0) {
    const time = (top - radius - start.y) / delta.y;
    const x = start.x + delta.x * time;
    if (validTime(time) && x >= left && x <= right) {
      hit = earliest(hit, {
        time,
        normal: { x: 0, y: -1 },
        obstacleIndex,
        face: { axis: 'x', min: left, max: right },
      });
    }
  } else if (delta.y < 0) {
    const time = (bottom + radius - start.y) / delta.y;
    const x = start.x + delta.x * time;
    if (validTime(time) && x >= left && x <= right) {
      hit = earliest(hit, {
        time,
        normal: { x: 0, y: 1 },
        obstacleIndex,
        face: { axis: 'x', min: left, max: right },
      });
    }
  }

  const lengthSquared = delta.x * delta.x + delta.y * delta.y;
  if (lengthSquared === 0 || radius === 0) return hit;

  const corners = [
    { x: left, y: top, quadrant: (point: Position) => point.x <= left && point.y <= top },
    { x: right, y: top, quadrant: (point: Position) => point.x >= right && point.y <= top },
    { x: left, y: bottom, quadrant: (point: Position) => point.x <= left && point.y >= bottom },
    { x: right, y: bottom, quadrant: (point: Position) => point.x >= right && point.y >= bottom },
  ];

  for (const corner of corners) {
    const offsetX = start.x - corner.x;
    const offsetY = start.y - corner.y;
    const b = 2 * (offsetX * delta.x + offsetY * delta.y);
    const c = offsetX * offsetX + offsetY * offsetY - radius * radius;
    const discriminant = b * b - 4 * lengthSquared * c;

    if (discriminant < 0) continue;

    const time = (-b - Math.sqrt(discriminant)) / (2 * lengthSquared);
    if (!validTime(time)) continue;

    const point = {
      x: start.x + delta.x * time,
      y: start.y + delta.y * time,
    };
    if (!corner.quadrant(point)) continue;

    const normalX = point.x - corner.x;
    const normalY = point.y - corner.y;
    const normalLength = Math.hypot(normalX, normalY);
    if (normalLength === 0) continue;

    const normal = { x: normalX / normalLength, y: normalY / normalLength };
    if (delta.x * normal.x + delta.y * normal.y >= -TIME_EPSILON) continue;

    hit = earliest(hit, {
      time,
      normal,
      obstacleIndex,
    });
  }

  return hit;
}

export function moveCircleWithObstacles(
  start: Position,
  desiredEnd: Position,
  radius: number,
  obstacles: readonly RectangleObstacle[],
  bounds: MovementBounds,
): Position {
  let position = constrainToBounds(start, bounds);
  let remaining = {
    x: desiredEnd.x - position.x,
    y: desiredEnd.y - position.y,
  };
  const safeRadius = Math.max(0, radius);
  const ignoredObstacles = new Set<number>();

  while (Math.hypot(remaining.x, remaining.y) > TIME_EPSILON) {
    let closestHit: SweepHit | null = null;

    for (let obstacleIndex = 0; obstacleIndex < obstacles.length; obstacleIndex += 1) {
      if (ignoredObstacles.has(obstacleIndex)) continue;
      closestHit = earliest(
        closestHit,
        sweepCircleAgainstRectangle(
          position,
          remaining,
          safeRadius,
          obstacles[obstacleIndex],
          obstacleIndex,
        ),
      );
    }

    if (!closestHit) {
      position = { x: position.x + remaining.x, y: position.y + remaining.y };
      break;
    }

    position = {
      x: position.x + remaining.x * closestHit.time,
      y: position.y + remaining.y * closestHit.time,
    };
    const remainingScale = 1 - closestHit.time;
    remaining = {
      x: remaining.x * remainingScale,
      y: remaining.y * remainingScale,
    };
    ignoredObstacles.clear();

    if (closestHit.face) {
      const tangent = closestHit.face.axis === 'x' ? remaining.x : remaining.y;
      const coordinate = closestHit.face.axis === 'x' ? position.x : position.y;
      const faceEnd = tangent > 0 ? closestHit.face.max : closestHit.face.min;
      const slideFraction = tangent === 0 ? Number.POSITIVE_INFINITY : (
        (faceEnd - coordinate) / tangent
      );

      if (slideFraction >= 0 && slideFraction < 1) {
        position = {
          x: position.x + (closestHit.face.axis === 'x'
            ? remaining.x * slideFraction + Math.sign(tangent) * TIME_EPSILON
            : 0),
          y: position.y + (closestHit.face.axis === 'y'
            ? remaining.y * slideFraction + Math.sign(tangent) * TIME_EPSILON
            : 0),
        };
        const afterSlideScale = 1 - slideFraction;
        remaining = {
          x: remaining.x * afterSlideScale,
          y: remaining.y * afterSlideScale,
        };
        ignoredObstacles.add(closestHit.obstacleIndex);
        continue;
      }
    }

    const intoSurface = remaining.x * closestHit.normal.x + remaining.y * closestHit.normal.y;

    if (intoSurface < 0) {
      remaining = {
        x: remaining.x - closestHit.normal.x * intoSurface,
        y: remaining.y - closestHit.normal.y * intoSurface,
      };
    }
  }

  return constrainToBounds(position, bounds);
}
