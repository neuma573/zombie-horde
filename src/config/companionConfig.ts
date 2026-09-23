/** Initial tuning; gameplay rules live in logic/companion.ts. */
export const COMPANION_CONFIG = {
  maximum: 4,
  minimumCourage: 0,
  maximumCourage: 100,
  initialMinimumCourage: 35,
  initialMaximumCourage: 85,
  normalCourage: 50,
  discoveryChance: 0.3,
  deathCourageLoss: 15,
  restCouragePerHour: 1,
  nightCourageGain: 3,
  baseDeathChance: 0.04,
  lowCourageDeathBonus: 0.16,
  minimumSearchEfficiency: 0.5,
  ammoPerCompanion: 1,
  fleeSpeed: 90,
  civilianPistolDamage: 10,
  civilianPistolIntervalMs: 2000,
} as const;

export const COMPANION_NAMES = {
  male: ['James', 'Daniel', 'Michael', 'David', 'Samuel', 'Ethan', 'Noah', 'Lucas'],
  female: ['Emma', 'Sarah', 'Olivia', 'Grace', 'Hannah', 'Maya', 'Claire', 'Emily'],
  surnames: ['Miller', 'Davis', 'Wilson', 'Brooks', 'Reed', 'Carter', 'Morgan', 'Hayes'],
} as const;
