import type { WeaponDefinition } from '../logic/weapon';
import { SHOTGUN_RELOAD_TIMELINE } from './shotgunReloadConfig';

export const PISTOL_WEAPON = {
  id: 'pistol',
  name: 'Service Pistol',
  description: 'Reliable semi-automatic sidearm.',
  rarity: 'common',
  recoil: 2,
  accuracy: {
    baseSpreadDegrees: 1.6,
    consecutiveSpreadGrowthDegrees: 0.7,
    maxSpreadDegrees: 4.4,
  },
  ammoType: 'pistolAmmo',
  config: {
    damage: 13,
    range: 1_200,
    fireIntervalMs: 150,
    magazineSize: 17,
    reserveAmmo: 100,
    reloadDurationMs: 1_500,
    maxTargets: 1,
  },
} as const satisfies WeaponDefinition;

export const BURST_RIFLE_WEAPON = {
  id: 'burstRifle',
  name: 'Burst Rifle',
  description: 'Fires a controlled three-round burst.',
  rarity: 'common',
  recoil: 7,
  accuracy: {
    baseSpreadDegrees: 0.65,
    consecutiveSpreadGrowthDegrees: 1,
    maxSpreadDegrees: 6.5,
  },
  ammoType: 'rifleAmmo',
  config: {
    damage: 18,
    range: 1_520,
    fireIntervalMs: 220,
    magazineSize: 30,
    reserveAmmo: 180,
    reloadDurationMs: 2_100,
    maxTargets: 1,
    burstSize: 3,
    burstIntervalMs: 65,
  },
} as const satisfies WeaponDefinition;

export const DOUBLE_BARREL_SHOTGUN_WEAPON = {
  id: 'doubleBarrelShotgun',
  name: 'Double-Barrel Shotgun',
  description: 'Devastating up close, with a wide pellet spread.',
  rarity: 'common',
  recoil: 10,
  accuracy: {
    baseSpreadDegrees: 0,
    consecutiveSpreadGrowthDegrees: 8,
    maxSpreadDegrees: 8,
  },
  ammoType: 'shotgunAmmo',
  config: {
    damage: 16,
    range: 1_200,
    fireIntervalMs: 180,
    magazineSize: 2,
    reserveAmmo: 24,
    reloadDurationMs: 2_400,
    maxTargets: 1,
    pelletCount: 8,
    pelletSpreadDegrees: 12,
    retainsSpentCasings: true,
    casingExtractionProgress: SHOTGUN_RELOAD_TIMELINE.emptyCasingExtract,
  },
} as const satisfies WeaponDefinition;

export const WEAPON_DEFINITIONS = {
  pistol: PISTOL_WEAPON,
  burstRifle: BURST_RIFLE_WEAPON,
  doubleBarrelShotgun: DOUBLE_BARREL_SHOTGUN_WEAPON,
} as const;

export const BASIC_WEAPON_CONFIG = PISTOL_WEAPON.config;

export const STARTING_AMMO_RESERVES = {
  pistolAmmo: PISTOL_WEAPON.config.reserveAmmo,
  rifleAmmo: 0,
  shotgunAmmo: 0,
} as const;
