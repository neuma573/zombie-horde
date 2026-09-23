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
  fleeSpeed: 90,
  fleeFadeDistance: 80,
  civilianPistolDamage: 10,
  civilianPistolIntervalMs: 2000,
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
  description: 'A weak, painfully slow sidearm.',
  config: { ...PISTOL_WEAPON.config, damage: COMPANION_CONFIG.civilianPistolDamage,
    fireIntervalMs: COMPANION_CONFIG.civilianPistolIntervalMs },
};

/** Initial Last Stand weapon caches; each provides one shared weapon. */
export const COMPANION_WEAPON_CACHES: Readonly<Partial<Record<string, WeaponId>>> = {
  police: 'burstRifle',
  'house-b': 'doubleBarrelShotgun',
};
