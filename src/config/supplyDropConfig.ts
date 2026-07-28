import type { SupplyDropConfig } from '../logic/supplyDrop';

const ORIGINAL_FLYOVER_DURATION_MS = 2_800;
const ORIGINAL_NORMAL_FALL_DURATION_MS = 1_100;

export const SUPPLY_DROP_BALANCE = {
  planeSpeedMultiplier: 0.5,
  normalFallDurationMultiplier: 3,
  emergencyFallDurationMultiplier: 2,
  normalBaseChance: 0.24,
  consecutiveMissChanceBonus: 0.09,
  lowAmmoChanceBonus: 0.32,
  criticalHealthChanceBonus: 0.2,
  criticalHealthRatio: 0.25,
  lowAmmoRatio: 0.3,
  rifleUnlockWave: 6,
  rifleDropChance: 0.28,
  locationSampleCount: 96,
  locationClearance: 42,
  normalMinimumPlayerDistance: 360,
  normalMaximumPlayerDistance: 1_150,
  emergencyMinimumPlayerDistance: 900,
  previousDropMinimumDistance: 520,
} as const;

export const NORMAL_SUPPLY_FALL_DURATION_MS = (
  ORIGINAL_NORMAL_FALL_DURATION_MS
  * SUPPLY_DROP_BALANCE.normalFallDurationMultiplier
);
export const EMERGENCY_SUPPLY_FALL_DURATION_MS = (
  NORMAL_SUPPLY_FALL_DURATION_MS
  * SUPPLY_DROP_BALANCE.emergencyFallDurationMultiplier
);

export const SUPPLY_DROP_CONFIG = {
  target: { x: 0, y: 0 },
  announcementDurationMs: 2_000,
  flyoverDurationMs: (
    ORIGINAL_FLYOVER_DURATION_MS / SUPPLY_DROP_BALANCE.planeSpeedMultiplier
  ),
  dropDelayMs: (
    ORIGINAL_FLYOVER_DURATION_MS / SUPPLY_DROP_BALANCE.planeSpeedMultiplier / 2
  ),
  fallDurationMs: NORMAL_SUPPLY_FALL_DURATION_MS,
  planeTravel: { x: 1_600, y: 900 },
  fallHeight: 180,
  indicatorMargin: 46,
  crateHealth: 90,
  crateSize: { width: 52, height: 42 },
  interactionRange: 86,
} as const satisfies SupplyDropConfig;
