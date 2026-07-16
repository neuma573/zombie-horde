import type { AimAssistConfig } from '../logic/aimAssist';

const degreesToRadians = (degrees: number): number => degrees * Math.PI / 180;

export const MOBILE_AIM_ASSIST_CONFIG = {
  acquisitionHalfAngleRadians: degreesToRadians(12),
  retentionHalfAngleRadians: degreesToRadians(16),
  maxTargetDistance: 480,
  viewportMargin: 0,
  angleWeight: 1,
  distanceWeight: 0.15,
  switchPenalty: 0.08,
} satisfies AimAssistConfig;
