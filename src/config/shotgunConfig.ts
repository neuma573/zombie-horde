import type { ShotgunKnockbackConfig } from '../logic/shotgunKnockback';

export const SHOTGUN_KNOCKBACK_CONFIG = {
  distancePerPellet: 14,
  maximumDistance: 84,
  durationMs: 220,
} as const satisfies ShotgunKnockbackConfig;
