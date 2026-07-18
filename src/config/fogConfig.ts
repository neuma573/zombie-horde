import type { FogOfWarConfig } from '../logic/fogOfWar';

export const FOG_OF_WAR_CONFIG = {
  initiallyEnabled: true,
  darknessAlpha: 0.88,
  nearbyVisionRadius: 150,
  viewDistance: 560,
  viewHalfAngleRadians: Math.PI / 4,
} satisfies FogOfWarConfig & { initiallyEnabled: boolean; darknessAlpha: number };
