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
