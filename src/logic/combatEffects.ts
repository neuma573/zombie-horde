import type { Vector2 } from './hitscan';

const MIN_RAY_LENGTH = 1e-6;

export interface ShotEffectEvent {
  origin: Vector2;
  endPoint: Vector2;
}

export interface ImpactEffectEvent {
  position: Vector2;
  radius: number;
}

export function constrainMuzzleToShotSegment(
  shotOrigin: Vector2,
  desiredMuzzle: Vector2,
  shotEndPoint: Vector2,
  endPadding = 2,
): Vector2 {
  const rayX = shotEndPoint.x - shotOrigin.x;
  const rayY = shotEndPoint.y - shotOrigin.y;
  const rayLength = Math.hypot(rayX, rayY);

  if (rayLength <= MIN_RAY_LENGTH) {
    return { ...shotOrigin };
  }

  const directionX = rayX / rayLength;
  const directionY = rayY / rayLength;
  const muzzleDistance =
    (desiredMuzzle.x - shotOrigin.x) * directionX
    + (desiredMuzzle.y - shotOrigin.y) * directionY;
  const maximumDistance = Math.max(0, rayLength - Math.max(0, endPadding));
  const constrainedDistance = Math.min(
    maximumDistance,
    Math.max(0, muzzleDistance),
  );

  return {
    x: shotOrigin.x + directionX * constrainedDistance,
    y: shotOrigin.y + directionY * constrainedDistance,
  };
}
