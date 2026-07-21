import type { TimeBasedLightingConfig } from '../logic/timeBasedLighting';

export const TIME_BASED_LIGHTING_CONFIG = {
  darknessKeyframes: [
    { minuteOfDay: 0, darknessAlpha: 0.78 },
    { minuteOfDay: 5 * 60, darknessAlpha: 0.78 },
    { minuteOfDay: 7 * 60, darknessAlpha: 0.08 },
    { minuteOfDay: 17 * 60, darknessAlpha: 0.08 },
    { minuteOfDay: 21 * 60, darknessAlpha: 0.78 },
    { minuteOfDay: 24 * 60, darknessAlpha: 0.78 },
  ],
  ambientLightRadius: 120,
  ambientTextureSize: 256,
  flashlightLength: 520,
  flashlightAngleRadians: Math.PI / 3,
  flashlightStartWidth: 18,
  flashlightCenterIntensity: 1,
  flashlightEdgeSoftness: 0.4,
  flashlightDistanceFalloff: 1.25,
  flashlightOnDarknessAlpha: 0.35,
  flashlightOffDarknessAlpha: 0.25,
  darknessResponseRate: 5,
  flashlightFadeInResponseRate: 3,
  flashlightFadeOutResponseRate: 5,
  muzzleFlashRadius: 105,
  muzzleFlashDecayRate: 28,
} satisfies TimeBasedLightingConfig;
