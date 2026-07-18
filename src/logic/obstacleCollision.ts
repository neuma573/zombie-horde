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
      hit = earliest(hit, { time, normal: { x: -1, y: 0 } });
    }
  } else if (delta.x < 0) {
    const time = (right + radius - start.x) / delta.x;
    const y = start.y + delta.y * time;
    if (validTime(time) && y >= top && y <= bottom) {
      hit = earliest(hit, { time, normal: { x: 1, y: 0 } });
    }
  }

  if (delta.y > 0) {
    const time = (top - radius - start.y) / delta.y;
    const x = start.x + delta.x * time;
    if (validTime(time) && x >= left && x <= right) {
      hit = earliest(hit, { time, normal: { x: 0, y: -1 } });
    }
  } else if (delta.y < 0) {
    const time = (bottom + radius - start.y) / delta.y;
    const x = start.x + delta.x * time;
    if (validTime(time) && x >= left && x <= right) {
      hit = earliest(hit, { time, normal: { x: 0, y: 1 } });
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

  while (Math.hypot(remaining.x, remaining.y) > TIME_EPSILON) {
    let closestHit: SweepHit | null = null;

    for (const obstacle of obstacles) {
      closestHit = earliest(
        closestHit,
        sweepCircleAgainstRectangle(position, remaining, safeRadius, obstacle),
      );
    }

    if (!closestHit) {
      position = { x: position.x + remaining.x, y: position.y + remaining.y };
      break;
    }

    const safeTime = Math.max(0, closestHit.time - TIME_EPSILON);
    position = {
      x: position.x + remaining.x * safeTime,
      y: position.y + remaining.y * safeTime,
    };
    const remainingScale = 1 - closestHit.time;
    remaining = {
      x: remaining.x * remainingScale,
      y: remaining.y * remainingScale,
    };
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
