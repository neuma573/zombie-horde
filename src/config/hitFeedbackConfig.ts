import type { ZombieHitReactionConfig } from '../logic/zombieHitFeedback';

export const ZOMBIE_HIT_REACTION_CONFIG = {
  durationMs: 180,
  recoilDistance: 7,
  recoilRotationRadians: 0.13,
} satisfies ZombieHitReactionConfig;

export const ZOMBIE_HIT_EFFECT_CONFIG = {
  burstDurationMs: 85,
  particleDurationMs: 170,
  particleDistance: 14,
  particleCount: 3,
} as const;

export const ZOMBIE_DEATH_EFFECT_CONFIG = {
  fallDurationMs: 450,
  restDurationMs: 900,
  fadeDurationMs: 450,
  driftDistance: 4,
  fallRotationRadians: 0.12,
  bloodPoolGrowDurationMs: 560,
  bloodPoolAlpha: 0.78,
} as const;
