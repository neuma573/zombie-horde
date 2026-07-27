export const WEAPON_PICKUP_WARNING_DURATION_MS = 5_000;
export const WEAPON_PICKUP_WARNING_START_HZ = 1.5;
export const WEAPON_PICKUP_WARNING_END_HZ = 6;

export function weaponPickupWarningPulseRateHz(
  remainingLifetimeMs: number,
  warningDurationMs = WEAPON_PICKUP_WARNING_DURATION_MS,
): number {
  const warningDuration = Math.max(1, warningDurationMs);
  const remaining = Math.min(
    warningDuration,
    Math.max(0, remainingLifetimeMs),
  );
  const progress = 1 - remaining / warningDuration;
  return WEAPON_PICKUP_WARNING_START_HZ
    + (WEAPON_PICKUP_WARNING_END_HZ - WEAPON_PICKUP_WARNING_START_HZ)
      * progress;
}

export function weaponPickupWarningAlpha(
  remainingLifetimeMs: number,
  warningDurationMs = WEAPON_PICKUP_WARNING_DURATION_MS,
): number {
  const remaining = Math.max(0, remainingLifetimeMs);
  const warningDuration = Math.max(0, warningDurationMs);
  if (remaining > warningDuration) return 1;

  const elapsedWarningMs = warningDuration - remaining;
  const elapsedSeconds = elapsedWarningMs / 1_000;
  const warningSeconds = Math.max(0.001, warningDuration / 1_000);
  const frequencyRange = WEAPON_PICKUP_WARNING_END_HZ
    - WEAPON_PICKUP_WARNING_START_HZ;
  const completedCycles = WEAPON_PICKUP_WARNING_START_HZ * elapsedSeconds
    + 0.5 * frequencyRange * elapsedSeconds ** 2 / warningSeconds;
  const pulse = 0.5 + 0.5 * Math.cos(completedCycles * Math.PI * 2);
  return 0.35 + pulse * 0.65;
}
