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
}

const EPSILON = 1e-7;

function sweepPointAgainstExpandedRectangle(
  start: Position,
  delta: Position,
  radius: number,
  obstacle: RectangleObstacle,
): SweepHit | null {
  const minX = obstacle.x - radius;
  const maxX = obstacle.x + Math.max(0, obstacle.width) + radius;
  const minY = obstacle.y - radius;
  const maxY = obstacle.y + Math.max(0, obstacle.height) + radius;

  const xNear = delta.x > 0
    ? (minX - start.x) / delta.x
    : delta.x < 0
      ? (maxX - start.x) / delta.x
      : Number.NEGATIVE_INFINITY;
  const xFar = delta.x > 0
    ? (maxX - start.x) / delta.x
    : delta.x < 0
      ? (minX - start.x) / delta.x
      : Number.POSITIVE_INFINITY;
  const yNear = delta.y > 0
    ? (minY - start.y) / delta.y
    : delta.y < 0
      ? (maxY - start.y) / delta.y
      : Number.NEGATIVE_INFINITY;
  const yFar = delta.y > 0
    ? (maxY - start.y) / delta.y
    : delta.y < 0
      ? (minY - start.y) / delta.y
      : Number.POSITIVE_INFINITY;

  if (delta.x === 0 && (start.x < minX || start.x > maxX)) return null;
  if (delta.y === 0 && (start.y < minY || start.y > maxY)) return null;

  const entryTime = Math.max(xNear, yNear);
  const exitTime = Math.min(xFar, yFar);

  if (entryTime > exitTime || entryTime < 0 || entryTime > 1) return null;

  if (xNear >= yNear) {
    return {
      time: entryTime,
      normal: { x: delta.x > 0 ? -1 : 1, y: 0 },
    };
  }

  return {
    time: entryTime,
    normal: { x: 0, y: delta.y > 0 ? -1 : 1 },
  };
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

  while (Math.hypot(remaining.x, remaining.y) > EPSILON) {
    let closestHit: SweepHit | null = null;

    for (const obstacle of obstacles) {
      const hit = sweepPointAgainstExpandedRectangle(
        position,
        remaining,
        safeRadius,
        obstacle,
      );

      if (hit && (!closestHit || hit.time < closestHit.time)) {
        closestHit = hit;
      }
    }

    if (!closestHit) {
      position = {
        x: position.x + remaining.x,
        y: position.y + remaining.y,
      };
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
    const intoSurface = remaining.x * closestHit.normal.x
      + remaining.y * closestHit.normal.y;

    if (intoSurface >= -EPSILON) break;

    remaining = {
      x: remaining.x - closestHit.normal.x * intoSurface,
      y: remaining.y - closestHit.normal.y * intoSurface,
    };
  }

  return constrainToBounds(position, bounds);
}
