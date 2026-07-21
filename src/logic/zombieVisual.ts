export interface ZombieAttackPose {
  upperElbowX: number;
  upperElbowY: number;
  upperHandX: number;
  upperHandY: number;
  lowerElbowX: number;
  lowerElbowY: number;
  lowerHandX: number;
  lowerHandY: number;
}

const IDLE_POSE: ZombieAttackPose = {
  upperElbowX: 17,
  upperElbowY: -15,
  upperHandX: 40,
  upperHandY: -8,
  lowerElbowX: 25,
  lowerElbowY: 13,
  lowerHandX: 40,
  lowerHandY: 9,
};

const WINDUP_POSE: ZombieAttackPose = {
  upperElbowX: 10,
  upperElbowY: -22,
  upperHandX: 25,
  upperHandY: -26,
  lowerElbowX: 24,
  lowerElbowY: 14,
  lowerHandX: 38,
  lowerHandY: 11,
};

const IMPACT_POSE: ZombieAttackPose = {
  upperElbowX: 31,
  upperElbowY: -1,
  upperHandX: 53,
  upperHandY: 11,
  lowerElbowX: 29,
  lowerElbowY: 10,
  lowerHandX: 45,
  lowerHandY: 7,
};

const WINDUP_FRACTION = 0.55;
export const ZOMBIE_ATTACK_RECOVERY_MS = 180;

function clamp01(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(1, Math.max(0, value));
}

function interpolatePose(
  start: ZombieAttackPose,
  end: ZombieAttackPose,
  amount: number,
): ZombieAttackPose {
  const t = clamp01(amount);
  const result = {} as ZombieAttackPose;

  for (const key of Object.keys(start) as Array<keyof ZombieAttackPose>) {
    result[key] = start[key] + (end[key] - start[key]) * t;
  }

  return result;
}

export function resolveZombieAttackPose(
  windupRemainingMs: number | null,
  cooldownRemainingMs: number,
  windupDurationMs: number,
  postImpactCooldownMs: number,
): ZombieAttackPose {
  if (windupRemainingMs !== null && windupDurationMs > 0) {
    const progress = clamp01(1 - windupRemainingMs / windupDurationMs);

    if (progress < WINDUP_FRACTION) {
      return interpolatePose(IDLE_POSE, WINDUP_POSE, progress / WINDUP_FRACTION);
    }

    const swingProgress = (progress - WINDUP_FRACTION) / (1 - WINDUP_FRACTION);
    return interpolatePose(WINDUP_POSE, IMPACT_POSE, swingProgress * swingProgress);
  }

  const timeSinceImpactMs = Math.max(0, postImpactCooldownMs - cooldownRemainingMs);
  if (cooldownRemainingMs > 0 && timeSinceImpactMs < ZOMBIE_ATTACK_RECOVERY_MS) {
    return interpolatePose(
      IMPACT_POSE,
      IDLE_POSE,
      timeSinceImpactMs / ZOMBIE_ATTACK_RECOVERY_MS,
    );
  }

  return { ...IDLE_POSE };
}
