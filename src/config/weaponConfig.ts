import type { WeaponConfig } from '../logic/weapon';

export const BASIC_WEAPON_CONFIG = {
  damage: 25,
  range: 600,
  fireIntervalMs: 250,
  magazineSize: 12,
  reserveAmmo: 300,
  reloadDurationMs: 1_500,
  maxTargets: 1,
} as const satisfies WeaponConfig;
