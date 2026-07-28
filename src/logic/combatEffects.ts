import type { Vector2 } from './hitscan';
import type { ZombieAppearance } from './zombieAppearance';

const MIN_RAY_LENGTH = 1e-6;

export interface ShotEffectEvent {
  origin: Vector2;
  endPoint: Vector2;
}

export interface ImpactEffectEvent {
  position: Vector2;
  radius: number;
  direction?: Vector2;
  rotation?: number;
  variantKey?: string;
  appearance?: ZombieAppearance;
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
  const muzzleOffsetX = desiredMuzzle.x - shotOrigin.x;
  const muzzleOffsetY = desiredMuzzle.y - shotOrigin.y;
  const muzzleDistance = muzzleOffsetX * directionX + muzzleOffsetY * directionY;
  const lateralX = muzzleOffsetX - directionX * muzzleDistance;
  const lateralY = muzzleOffsetY - directionY * muzzleDistance;
  const maximumDistance = Math.max(0, rayLength - Math.max(0, endPadding));
  const constrainedDistance = Math.min(
    maximumDistance,
    Math.max(0, muzzleDistance),
  );
  const lateralScale = muzzleDistance > MIN_RAY_LENGTH
    ? constrainedDistance / muzzleDistance
    : 0;

  return {
    x: shotOrigin.x + directionX * constrainedDistance + lateralX * lateralScale,
    y: shotOrigin.y + directionY * constrainedDistance + lateralY * lateralScale,
  };
}
