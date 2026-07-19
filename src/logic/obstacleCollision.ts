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
  face?: {
    axis: 'x' | 'y';
    min: number;
    max: number;
  };
  corner?: {
    position: Position;
    minNormalAngle: number;
    maxNormalAngle: number;
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

function isOnFiniteFace(value: number, min: number, max: number, tangent: number): boolean {
  if (value < min || value > max) return false;
  if (Math.abs(value - min) <= TIME_EPSILON && tangent < 0) return false;
  if (Math.abs(value - max) <= TIME_EPSILON && tangent > 0) return false;
  return true;
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
    if (validTime(time) && isOnFiniteFace(y, top, bottom, delta.y)) {
      hit = earliest(hit, {
        time,
        normal: { x: -1, y: 0 },
        face: { axis: 'y', min: top, max: bottom },
      });
    }
  } else if (delta.x < 0) {
    const time = (right + radius - start.x) / delta.x;
    const y = start.y + delta.y * time;
    if (validTime(time) && isOnFiniteFace(y, top, bottom, delta.y)) {
      hit = earliest(hit, {
        time,
        normal: { x: 1, y: 0 },
        face: { axis: 'y', min: top, max: bottom },
      });
    }
  }

  if (delta.y > 0) {
    const time = (top - radius - start.y) / delta.y;
    const x = start.x + delta.x * time;
    if (validTime(time) && isOnFiniteFace(x, left, right, delta.x)) {
      hit = earliest(hit, {
        time,
        normal: { x: 0, y: -1 },
        face: { axis: 'x', min: left, max: right },
      });
    }
  } else if (delta.y < 0) {
    const time = (bottom + radius - start.y) / delta.y;
    const x = start.x + delta.x * time;
    if (validTime(time) && isOnFiniteFace(x, left, right, delta.x)) {
      hit = earliest(hit, {
        time,
        normal: { x: 0, y: 1 },
        face: { axis: 'x', min: left, max: right },
      });
    }
  }

  const lengthSquared = delta.x * delta.x + delta.y * delta.y;
  if (lengthSquared === 0 || radius === 0) return hit;

  const corners = [
    {
      x: left,
      y: top,
      minNormalAngle: Math.PI,
      maxNormalAngle: Math.PI * 1.5,
      quadrant: (point: Position) => point.x <= left && point.y <= top,
    },
    {
      x: right,
      y: top,
      minNormalAngle: Math.PI * 1.5,
      maxNormalAngle: Math.PI * 2,
      quadrant: (point: Position) => point.x >= right && point.y <= top,
    },
    {
      x: left,
      y: bottom,
      minNormalAngle: Math.PI * 0.5,
      maxNormalAngle: Math.PI,
      quadrant: (point: Position) => point.x <= left && point.y >= bottom,
    },
    {
      x: right,
      y: bottom,
      minNormalAngle: 0,
      maxNormalAngle: Math.PI * 0.5,
      quadrant: (point: Position) => point.x >= right && point.y >= bottom,
    },
  ];

  for (const corner of corners) {
    const offsetX = start.x - corner.x;
    const offsetY = start.y - corner.y;
    const b = 2 * (offsetX * delta.x + offsetY * delta.y);
    const c = offsetX * offsetX + offsetY * offsetY - radius * radius;
    const contactTolerance = TIME_EPSILON * Math.max(1, radius * radius);
    const movingIntoCorner = offsetX * delta.x + offsetY * delta.y < -TIME_EPSILON;

    if (c <= contactTolerance && movingIntoCorner) {
      const normalLength = Math.hypot(offsetX, offsetY);
      if (normalLength > TIME_EPSILON) {
        hit = earliest(hit, {
          time: 0,
          normal: { x: offsetX / normalLength, y: offsetY / normalLength },
          corner: {
            position: corner,
            minNormalAngle: corner.minNormalAngle,
            maxNormalAngle: corner.maxNormalAngle,
          },
        });
      }
      continue;
    }
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
      corner: {
        position: corner,
        minNormalAngle: corner.minNormalAngle,
        maxNormalAngle: corner.maxNormalAngle,
      },
    });
  }

  return hit;
}

function slideAroundCorner(
  position: Position,
  remaining: Position,
  corner: NonNullable<SweepHit['corner']>,
  radius: number,
): { position: Position; remaining: Position } {
  const speed = Math.hypot(remaining.x, remaining.y);
  if (speed <= TIME_EPSILON || radius <= TIME_EPSILON) {
    return { position, remaining: { x: 0, y: 0 } };
  }

  const velocityAngle = Math.atan2(remaining.y, remaining.x);
  const normalAngle = Math.atan2(
    position.y - corner.position.y,
    position.x - corner.position.x,
  );
  let relativeAngle = velocityAngle - normalAngle;
  relativeAngle = Math.atan2(Math.sin(relativeAngle), Math.cos(relativeAngle));
  const tangentHalfAngle = Math.tan(relativeAngle / 2);

  if (!Number.isFinite(tangentHalfAngle) || Math.abs(tangentHalfAngle) <= 1) {
    return { position, remaining: { x: 0, y: 0 } };
  }

  const exitTime = radius / speed * Math.log(Math.abs(tangentHalfAngle));
  const tangentSpeed = -remaining.x * Math.sin(normalAngle)
    + remaining.y * Math.cos(normalAngle);
  const boundaryAngle = tangentSpeed > 0
    ? corner.maxNormalAngle
    : corner.minNormalAngle;
  let boundaryRelativeAngle = velocityAngle - boundaryAngle;
  boundaryRelativeAngle = Math.atan2(
    Math.sin(boundaryRelativeAngle),
    Math.cos(boundaryRelativeAngle),
  );
  const boundaryHalfAngle = Math.tan(boundaryRelativeAngle / 2);
  const boundaryTime = radius / speed * (
    Math.log(Math.abs(tangentHalfAngle)) - Math.log(Math.abs(boundaryHalfAngle))
  );
  const reachesBoundary = Number.isFinite(boundaryTime)
    && boundaryTime >= 0
    && boundaryTime <= exitTime;
  const consumedTime = Math.min(
    1,
    Math.max(0, reachesBoundary ? boundaryTime : exitTime),
  );
  const nextHalfAngle = tangentHalfAngle * Math.exp(-speed * consumedTime / radius);
  const nextRelativeAngle = 2 * Math.atan(nextHalfAngle);
  const nextNormalAngle = velocityAngle - nextRelativeAngle;
  const stoppedAtBoundary = reachesBoundary && boundaryTime <= 1;
  const finalNormalAngle = stoppedAtBoundary ? boundaryAngle : nextNormalAngle;
  const nextPosition = {
    x: corner.position.x + Math.cos(finalNormalAngle) * radius,
    y: corner.position.y + Math.sin(finalNormalAngle) * radius,
  };
  const remainingScale = 1 - consumedTime;

  return {
    position: nextPosition,
    remaining: {
      x: remaining.x * remainingScale,
      y: remaining.y * remainingScale,
    },
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

  while (Math.hypot(remaining.x, remaining.y) > TIME_EPSILON) {
    let closestHit: SweepHit | null = null;

    for (let obstacleIndex = 0; obstacleIndex < obstacles.length; obstacleIndex += 1) {
      closestHit = earliest(
        closestHit,
        sweepCircleAgainstRectangle(
          position,
          remaining,
          safeRadius,
          obstacles[obstacleIndex],
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
            ? remaining.x * slideFraction
            : 0),
          y: position.y + (closestHit.face.axis === 'y'
            ? remaining.y * slideFraction
            : 0),
        };
        const afterSlideScale = 1 - slideFraction;
        remaining = {
          x: remaining.x * afterSlideScale,
          y: remaining.y * afterSlideScale,
        };
        continue;
      }
    }

    if (closestHit.corner) {
      const slide = slideAroundCorner(
        position,
        remaining,
        closestHit.corner,
        safeRadius,
      );
      position = slide.position;
      remaining = slide.remaining;
      continue;
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
