const MINUTES_PER_DAY = 24 * 60;

export interface DarknessKeyframe {
  minuteOfDay: number;
  darknessAlpha: number;
}

export interface TimeBasedLightingConfig {
  darknessKeyframes: readonly DarknessKeyframe[];
  ambientLightRadius: number;
  ambientTextureSize: number;
  flashlightLength: number;
  flashlightAngleRadians: number;
  flashlightStartWidth: number;
  flashlightCenterIntensity: number;
  flashlightEdgeSoftness: number;
  flashlightDistanceFalloff: number;
  flashlightOnDarknessAlpha: number;
  flashlightOffDarknessAlpha: number;
  darknessResponseRate: number;
  flashlightFadeInResponseRate: number;
  flashlightFadeOutResponseRate: number;
  muzzleFlashRadius: number;
  muzzleFlashDecayRate: number;
}

export function dampValue(
  current: number,
  target: number,
  deltaMs: number,
  responseRate: number,
): number {
  if (!Number.isFinite(current) || !Number.isFinite(target)) return 0;
  if (!Number.isFinite(deltaMs) || deltaMs <= 0) return current;
  if (!Number.isFinite(responseRate) || responseRate <= 0) return current;

  const factor = 1 - Math.exp(-responseRate * deltaMs / 1_000);
  return current + (target - current) * factor;
}

export function renderableDarknessAlpha(
  targetDarknessAlpha: number,
  supportsLightMask: boolean,
): number {
  if (!supportsLightMask) return 0;
  return clampAlpha(targetDarknessAlpha);
}

export function decayTransientLight(
  intensity: number,
  deltaMs: number,
  decayRate: number,
): number {
  return clampAlpha(dampValue(clampAlpha(intensity), 0, deltaMs, decayRate));
}

export function resolveFlashlightEnabled(
  currentlyEnabled: boolean,
  darknessAlpha: number,
  turnOnAlpha: number,
  turnOffAlpha: number,
): boolean {
  const darkness = clampAlpha(darknessAlpha);
  const onThreshold = clampAlpha(turnOnAlpha);
  const offThreshold = Math.min(onThreshold, clampAlpha(turnOffAlpha));

  if (currentlyEnabled) return darkness > offThreshold;
  return darkness >= onThreshold;
}

export function darknessAlphaForTime(
  minuteOfDay: number,
  keyframes: readonly DarknessKeyframe[],
): number {
  if (keyframes.length === 0) return 0;

  const sorted = [...keyframes].sort((left, right) => left.minuteOfDay - right.minuteOfDay);
  const minute = wrapMinuteOfDay(minuteOfDay);
  const nextIndex = sorted.findIndex((keyframe) => keyframe.minuteOfDay >= minute);
  const next = nextIndex === -1 ? sorted[0] : sorted[nextIndex];
  const previous = nextIndex <= 0 ? sorted[sorted.length - 1] : sorted[nextIndex - 1];
  const previousMinute = nextIndex <= 0 ? previous.minuteOfDay - MINUTES_PER_DAY : previous.minuteOfDay;
  const nextMinute = nextIndex === -1 ? next.minuteOfDay + MINUTES_PER_DAY : next.minuteOfDay;
  const adjustedMinute = nextIndex <= 0 ? minute - MINUTES_PER_DAY : minute;
  const duration = nextMinute - previousMinute;

  if (duration <= 0) return clampAlpha(next.darknessAlpha);

  const linearProgress = (adjustedMinute - previousMinute) / duration;
  const smoothProgress = smootherstep(linearProgress);

  return clampAlpha(
    previous.darknessAlpha
      + (next.darknessAlpha - previous.darknessAlpha) * smoothProgress,
  );
}

function smootherstep(value: number): number {
  const normalized = Math.min(1, Math.max(0, value));
  return normalized * normalized * normalized
    * (normalized * (normalized * 6 - 15) + 10);
}

function wrapMinuteOfDay(minute: number): number {
  if (!Number.isFinite(minute)) return 0;
  return ((minute % MINUTES_PER_DAY) + MINUTES_PER_DAY) % MINUTES_PER_DAY;
}

function clampAlpha(alpha: number): number {
  if (!Number.isFinite(alpha)) return 0;
  return Math.min(1, Math.max(0, alpha));
}
