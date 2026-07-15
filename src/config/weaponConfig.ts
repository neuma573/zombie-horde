import type { WeaponConfig } from '../logic/weapon';

export const BASIC_WEAPON_CONFIG: WeaponConfig = {
  damage: 25,
  range: 600,
  fireIntervalMs: 250,
  magazineSize: 12,
  reserveAmmo: 48,
  reloadDurationMs: 1_500,
  maxTargets: 1,
};
