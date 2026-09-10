import { SHOTGUN_RELOAD_TIMELINE } from '../config/shotgunReloadConfig';

export interface SidearmPose {
  x: number;
  y: number;
  rotation: number;
}

export interface ShoveVisualPose {
  forwardOffset: number;
}

export interface OneHandedMeleePose extends SidearmHandPose {
  weaponPosition: { x: number; y: number };
  weaponRotation: number;
}

function interpolateMeleePose(
  start: OneHandedMeleePose,
  end: OneHandedMeleePose,
  amount: number,
): OneHandedMeleePose {
  return {
    leftHand: interpolatePoint(start.leftHand, end.leftHand, amount),
    leftElbow: interpolatePoint(start.leftElbow, end.leftElbow, amount),
    rightHand: interpolatePoint(start.rightHand, end.rightHand, amount),
    rightElbow: interpolatePoint(start.rightElbow, end.rightElbow, amount),
    weaponPosition: interpolatePoint(start.weaponPosition, end.weaponPosition, amount),
    weaponRotation: lerpNumber(start.weaponRotation, end.weaponRotation, amount),
  };
}

function interpolatePoint(
  start: { x: number; y: number },
  end: { x: number; y: number },
  amount: number,
): { x: number; y: number } {
  return {
    x: lerpNumber(start.x, end.x, amount),
    y: lerpNumber(start.y, end.y, amount),
  };
}

export function resolveOneHandedMeleePose(
  elapsedMs: number | null,
  durationMs: number,
): OneHandedMeleePose {
  const ready = {
    leftHand: { x: 20, y: -11 },
    leftElbow: { x: 9, y: -12 },
    rightHand: { x: 16, y: 10 },
    rightElbow: { x: 7, y: 12 },
    weaponPosition: { x: 16, y: 10 },
    weaponRotation: 0,
  };
  if (elapsedMs === null || !Number.isFinite(elapsedMs) || durationMs <= 0) return ready;
  const progress = Math.min(1, Math.max(0, elapsedMs / durationMs));
  const windup = {
    ...ready,
    rightHand: { x: 5, y: 19 },
    rightElbow: { x: 2, y: 15 },
    weaponPosition: { x: 5, y: 19 },
    weaponRotation: 1.05,
  };
  const impact = {
    leftHand: { x: 19, y: -11 },
    leftElbow: { x: 8.5, y: -11.5 },
    rightHand: { x: 25, y: -6 },
    rightElbow: { x: 13, y: 7 },
    weaponPosition: { x: 25, y: -6 },
    weaponRotation: -0.72,
  };
  if (progress < 0.28) return interpolateMeleePose(ready, windup, progress / 0.28);
  if (progress < 0.56) return interpolateMeleePose(windup, impact, (progress - 0.28) / 0.28);
  return interpolateMeleePose(impact, ready, (progress - 0.56) / 0.44);
}

export function resolveSystemaMeleeShovePose(
  elapsedMs: number | null,
  durationMs: number,
): OneHandedMeleePose {
  const ready = resolveOneHandedMeleePose(null, durationMs);
  if (elapsedMs === null || !Number.isFinite(elapsedMs) || durationMs <= 0) return ready;
  const shove = resolveShoveVisualPose(elapsedMs, durationMs);
  const extension = Math.min(1, Math.max(0, shove.forwardOffset / 15));

  return {
    leftHand: { x: ready.leftHand.x + shove.forwardOffset, y: ready.leftHand.y },
    leftElbow: {
      x: lerpNumber(ready.leftElbow.x, 18, extension),
      y: lerpNumber(ready.leftElbow.y, -11.5, extension),
    },
    rightHand: { x: ready.rightHand.x - extension * 2, y: ready.rightHand.y },
    rightElbow: { x: ready.rightElbow.x - extension, y: ready.rightElbow.y },
    weaponPosition: {
      x: ready.weaponPosition.x - extension * 2,
      y: ready.weaponPosition.y,
    },
    weaponRotation: ready.weaponRotation,
  };
}

export function resolveOneHandedMeleeActionPose(
  swingElapsedMs: number | null,
  swingDurationMs: number,
  shoveElapsedMs: number | null,
  shoveDurationMs: number,
): OneHandedMeleePose {
  const swingPose = resolveOneHandedMeleePose(swingElapsedMs, swingDurationMs);
  if (shoveElapsedMs === null) return swingPose;

  const shovePose = resolveSystemaMeleeShovePose(shoveElapsedMs, shoveDurationMs);
  if (swingElapsedMs === null) return shovePose;

  return {
    ...swingPose,
    leftHand: shovePose.leftHand,
    leftElbow: shovePose.leftElbow,
  };
}

export interface ArmJointPose {
  elbow: { x: number; y: number };
  hand: { x: number; y: number };
}

function lerpNumber(start: number, end: number, amount: number): number {
  return start + (end - start) * amount;
}

export function resolveShoveVisualPose(
  elapsedMs: number | null,
  durationMs: number,
): ShoveVisualPose {
  if (elapsedMs === null || !Number.isFinite(elapsedMs) || durationMs <= 0) {
    return { forwardOffset: 0 };
  }

  const progress = Math.min(1, Math.max(0, elapsedMs / durationMs));
  if (progress < 0.27) {
    return {
      forwardOffset: lerpNumber(0, 15, progress / 0.27),
    };
  }
  if (progress < 0.48) {
    return { forwardOffset: 15 };
  }
  return {
    forwardOffset: lerpNumber(15, 0, (progress - 0.48) / 0.52),
  };
}

export function resolveShoveArmPose(
  shoulder: { x: number; y: number },
  restingElbow: { x: number; y: number },
  restingHand: { x: number; y: number },
  shove: ShoveVisualPose,
  maximumForwardOffset = 15,
): ArmJointPose {
  const extension = maximumForwardOffset > 0
    ? Math.min(1, Math.max(0, shove.forwardOffset / maximumForwardOffset))
    : 0;
  const hand = {
    x: restingHand.x + shove.forwardOffset,
    y: restingHand.y,
  };
  const straightElbow = {
    x: shoulder.x + (hand.x - shoulder.x) * 0.52,
    y: shoulder.y + (hand.y - shoulder.y) * 0.52,
  };

  return {
    hand,
    elbow: {
      x: lerpNumber(restingElbow.x, straightElbow.x, extension),
      y: lerpNumber(restingElbow.y, straightElbow.y, extension),
    },
  };
}

export interface SidearmHandPose {
  rightHand: { x: number; y: number };
  leftHand: { x: number; y: number };
  rightElbow: { x: number; y: number };
  leftElbow: { x: number; y: number };
}

export interface SidearmShoulderPose {
  leftY: number;
  rightY: number;
}

export const SIDEARM_VISUAL = {
  length: 18,
  width: 5,
  readyPose: { x: 40.7, y: 7, rotation: 0 },
  reloadPose: { x: 9, y: -15, rotation: -1.15 },
} as const;

export const RIFLE_VISUAL = {
  length: 46,
  width: 8,
  readyPose: { x: 25, y: 9, rotation: 0 },
  leftHand: { x: 26.3, y: 3.95 },
  rightHand: { x: 12.8, y: 13.15 },
  supportPoint: { x: 26.3, y: -5.05 },
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

export function resolveShotgunBreakAngle(
  isReloading: boolean,
  normalizedProgress: number,
): number {
  if (!isReloading) return 0;
  const progress = clamp01(normalizedProgress);
  if (progress < SHOTGUN_RELOAD_TIMELINE.breechOpenComplete) {
    return lerp(
      0,
      0.82,
      progress / SHOTGUN_RELOAD_TIMELINE.breechOpenComplete,
    );
  }
  if (progress < SHOTGUN_RELOAD_TIMELINE.breechCloseStart) return 0.82;
  if (progress < SHOTGUN_RELOAD_TIMELINE.breechCloseComplete) {
    return lerp(
      0.82,
      0,
      (progress - SHOTGUN_RELOAD_TIMELINE.breechCloseStart)
        / (SHOTGUN_RELOAD_TIMELINE.breechCloseComplete
          - SHOTGUN_RELOAD_TIMELINE.breechCloseStart),
    );
  }
  return 0;
}

export function resolveSidearmHandPose(
  pose: SidearmPose,
  shoulders: SidearmShoulderPose = { leftY: -9, rightY: 10 },
): SidearmHandPose {
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
  const rightShoulder = { x: 2, y: shoulders.rightY };

  return {
    rightHand,
    leftHand,
    rightElbow: {
      x: lerp(rightShoulder.x, rightHand.x, 0.55),
      y: lerp(rightShoulder.y, rightHand.y, 0.55),
    },
    leftElbow: {
      x: lerp(2, leftHand.x, 0.42),
      y: lerp(shoulders.leftY, leftHand.y, 0.35) - 5,
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

export function clampPonytailRelativeRotation(
  characterRotation: number,
  ponytailWorldRotation: number,
  maximumLagRadians: number,
): number {
  if (
    !Number.isFinite(characterRotation)
    || !Number.isFinite(ponytailWorldRotation)
  ) {
    return 0;
  }

  const safeMaximum = Number.isFinite(maximumLagRadians)
    ? Math.max(0, Math.min(Math.PI / 2, maximumLagRadians))
    : 0;
  const relativeRotation = wrapAngle(
    ponytailWorldRotation - characterRotation,
  );
  return Math.max(-safeMaximum, Math.min(safeMaximum, relativeRotation));
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

function wrapAngle(angle: number): number {
  return Math.atan2(Math.sin(angle), Math.cos(angle));
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
