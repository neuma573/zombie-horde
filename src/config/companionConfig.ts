import { PISTOL_WEAPON } from './weaponConfig';
import type { WeaponDefinition, WeaponId } from '../logic/weapon';
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
  fleeSpeed: 260,
  fleeFadeDistance: 80,
  civilianPistolDamage: 10,
  civilianPistolIntervalMs: 800,
  civilianPistolPauseMs: { min: 450, max: 900 },
  engagementRange: 700,
  aimSpreadDegrees: 10,
  aimTimeMs: { min: 650, max: 1150 },
  triggerPauseMs: { min: 750, max: 1500 },
  turnSpeedRadians: Math.PI,
  aimToleranceRadians: Math.PI / 60,
  repositionWaitMs: { min: 3500, max: 6500 },
  repositionRadius: 24,
  repositionSpeed: 32,
  settleTimeMs: 250,
} as const;

export const COMPANION_NAMES = {
  male: ['James', 'Daniel', 'Michael', 'David', 'Samuel', 'Ethan', 'Noah', 'Lucas'],
  female: ['Emma', 'Sarah', 'Olivia', 'Grace', 'Hannah', 'Maya', 'Claire', 'Emily'],
  surnames: ['Miller', 'Davis', 'Wilson', 'Brooks', 'Reed', 'Carter', 'Morgan', 'Hayes'],
} as const;

/** Personal fallback, using the existing pistol pose and ammunition mechanics. */
export const COMPANION_PISTOL: WeaponDefinition = {
  ...PISTOL_WEAPON,
  name: 'Worn Pistol',
  description: 'A worn sidearm with modest stopping power.',
  config: { ...PISTOL_WEAPON.config, damage: COMPANION_CONFIG.civilianPistolDamage,
    fireIntervalMs: COMPANION_CONFIG.civilianPistolIntervalMs },
};

/** Initial Last Stand weapon caches; each provides one shared weapon. */
export const COMPANION_WEAPON_CACHES: Readonly<Partial<Record<string, WeaponId>>> = {
  police: 'burstRifle',
  'house-b': 'doubleBarrelShotgun',
};
