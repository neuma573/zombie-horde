export interface SidearmPose {
  x: number;
  y: number;
  rotation: number;
}

export const SIDEARM_VISUAL = {
  length: 18,
  width: 5,
  readyPose: { x: 44, y: 0, rotation: 0 },
  reloadPose: { x: 9, y: -15, rotation: -1.15 },
} as const;

export function blendVisualColor(
  baseColor: number,
  reflectedColor: number,
  intensity: number,
): number {
  const amount = clamp01(intensity);
  const blendChannel = (shift: number): number => Math.round(
    ((baseColor >> shift) & 0xff) * (1 - amount)
      + ((reflectedColor >> shift) & 0xff) * amount,
  );

  return (blendChannel(16) << 16) | (blendChannel(8) << 8) | blendChannel(0);
}

export function muzzleLightExposure(
  origin: { x: number; y: number },
  direction: { x: number; y: number },
  target: { x: number; y: number },
  maximumDistance: number,
  halfAngleRadians: number,
): number {
  const directionLength = Math.hypot(direction.x, direction.y);
  const offsetX = target.x - origin.x;
  const offsetY = target.y - origin.y;
  const distance = Math.hypot(offsetX, offsetY);

  if (
    directionLength <= 1e-8
    || distance <= 1e-8
    || maximumDistance <= 0
    || distance > maximumDistance
  ) {
    return 0;
  }

  const dot = (
    direction.x * offsetX + direction.y * offsetY
  ) / (directionLength * distance);
  const angle = Math.acos(Math.min(1, Math.max(-1, dot)));
  const halfAngle = Math.max(1e-8, halfAngleRadians);

  if (angle >= halfAngle) return 0;

  const angularFalloff = 1 - angle / halfAngle;
  const distanceFalloff = 1 - distance / maximumDistance;
  return clamp01(angularFalloff * distanceFalloff);
}

function clamp01(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(1, Math.max(0, value));
}

function lerp(start: number, end: number, amount: number): number {
  return start + (end - start) * amount;
}

export function resolveSidearmPose(
  isReloading: boolean,
  normalizedProgress: number,
): SidearmPose {
  if (!isReloading) return { ...SIDEARM_VISUAL.readyPose };

  const progress = clamp01(normalizedProgress);
  const poseAmount = Math.sin(progress * Math.PI);

  return {
    x: lerp(SIDEARM_VISUAL.readyPose.x, SIDEARM_VISUAL.reloadPose.x, poseAmount),
    y: lerp(SIDEARM_VISUAL.readyPose.y, SIDEARM_VISUAL.reloadPose.y, poseAmount),
    rotation: lerp(
      SIDEARM_VISUAL.readyPose.rotation,
      SIDEARM_VISUAL.reloadPose.rotation,
      poseAmount,
    ),
  };
}
