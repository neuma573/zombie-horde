export interface SidearmPose {
  x: number;
  y: number;
  rotation: number;
}

export interface SidearmHandPose {
  rightHand: { x: number; y: number };
  leftHand: { x: number; y: number };
  rightElbow: { x: number; y: number };
  leftElbow: { x: number; y: number };
}

export const SIDEARM_VISUAL = {
  length: 18,
  width: 5,
  readyPose: { x: 44, y: 7, rotation: 0 },
  reloadPose: { x: 9, y: -15, rotation: -1.15 },
} as const;

export const RIFLE_VISUAL = {
  length: 46,
  width: 8,
  readyPose: { x: 25, y: 9, rotation: 0 },
  leftHand: { x: 29, y: 6 },
  rightHand: { x: 14, y: 13 },
  supportPoint: { x: 29, y: -3 },
} as const;

export interface RifleReloadVisual {
  pose: SidearmPose;
  leftHand: { x: number; y: number };
  rightHand: { x: number; y: number };
  magazine: {
    visible: boolean;
    x: number;
    y: number;
    rotation: number;
  };
  chargingHandleOffset: number;
}

export function resolveRifleReloadVisual(
  isReloading: boolean,
  normalizedProgress: number,
): RifleReloadVisual {
  if (!isReloading) {
    return {
      pose: { ...RIFLE_VISUAL.readyPose },
      leftHand: { ...RIFLE_VISUAL.leftHand },
      rightHand: { ...RIFLE_VISUAL.rightHand },
      magazine: { visible: false, x: 18, y: 14, rotation: 0 },
      chargingHandleOffset: 0,
    };
  }

  const progress = clamp01(normalizedProgress);
  const settleAmount = Math.sin(progress * Math.PI);
  const pose = {
    x: lerp(RIFLE_VISUAL.readyPose.x, 18, settleAmount),
    y: lerp(RIFLE_VISUAL.readyPose.y, -7, settleAmount),
    rotation: lerp(0, -0.5, settleAmount),
  };
  const leftHand = riflePointForPose(RIFLE_VISUAL.supportPoint, pose);

  if (progress < 0.24) {
    const amount = segmentProgress(progress, 0, 0.24);
    return {
      pose,
      leftHand,
      rightHand: {
        x: lerp(RIFLE_VISUAL.rightHand.x, 1, amount),
        y: lerp(RIFLE_VISUAL.rightHand.y, 17, amount),
      },
      magazine: { visible: false, x: 1, y: 18, rotation: -0.25 },
      chargingHandleOffset: 0,
    };
  }

  if (progress < 0.58) {
    const amount = segmentProgress(progress, 0.24, 0.58);
    const x = lerp(1, 18, amount);
    const y = lerp(18, 3, amount);
    return {
      pose,
      leftHand,
      rightHand: { x, y },
      magazine: { visible: true, x, y, rotation: lerp(-0.25, 0, amount) },
      chargingHandleOffset: 0,
    };
  }

  if (progress < 0.76) {
    const amount = segmentProgress(progress, 0.58, 0.76);
    return {
      pose,
      leftHand,
      rightHand: {
        x: lerp(18, 13, amount),
        y: lerp(7, -8, amount),
      },
      magazine: { visible: false, x: 18, y: 3, rotation: 0 },
      chargingHandleOffset: 0,
    };
  }

  const chargeAmount = segmentProgress(progress, 0.76, 1);
  const pullAmount = Math.sin(chargeAmount * Math.PI);
  return {
    pose,
    leftHand,
    rightHand: {
      x: lerp(13, RIFLE_VISUAL.rightHand.x, chargeAmount) - pullAmount * 6,
      y: lerp(-8, RIFLE_VISUAL.rightHand.y, chargeAmount),
    },
    magazine: { visible: false, x: 18, y: 3, rotation: 0 },
    chargingHandleOffset: -pullAmount * 5,
  };
}

export function resolveSidearmHandPose(pose: SidearmPose): SidearmHandPose {
  const direction = {
    x: Math.cos(pose.rotation),
    y: Math.sin(pose.rotation),
  };
  const normal = { x: -direction.y, y: direction.x };
  const grip = {
    x: pose.x - direction.x * SIDEARM_VISUAL.length / 2,
    y: pose.y - direction.y * SIDEARM_VISUAL.length / 2,
  };
  const rightHand = {
    x: grip.x + normal.x * 2,
    y: grip.y + normal.y * 2,
  };
  const leftHand = {
    x: grip.x - normal.x * 2,
    y: grip.y - normal.y * 2,
  };
  const rightShoulder = { x: 2, y: 10 };

  return {
    rightHand,
    leftHand,
    rightElbow: {
      x: lerp(rightShoulder.x, rightHand.x, 0.55),
      y: lerp(rightShoulder.y, rightHand.y, 0.55),
    },
    leftElbow: {
      x: lerp(2, leftHand.x, 0.42),
      y: lerp(-9, leftHand.y, 0.35) - 5,
    },
  };
}

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

function segmentProgress(value: number, start: number, end: number): number {
  return clamp01((value - start) / Math.max(1e-8, end - start));
}

function riflePointForPose(
  point: { x: number; y: number },
  pose: SidearmPose,
): { x: number; y: number } {
  const cos = Math.cos(pose.rotation);
  const sin = Math.sin(pose.rotation);
  return {
    x: pose.x - RIFLE_VISUAL.readyPose.x + point.x * cos - point.y * sin,
    y: pose.y + point.x * sin + point.y * cos,
  };
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
