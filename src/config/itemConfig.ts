import type { ItemBalanceConfig } from '../logic/item';

export const ITEM_BALANCE_CONFIG = {
  pistolAmmoAmount: 68,
  rifleAmmoAmount: 60,
  medicalHealingAmount: 35,
  pickupRadius: 42,
  dropMinimumDistance: 72,
  dropMaximumDistance: 138,
  dropClearance: 26,
  normalMedicalChance: 0.3,
  criticalHealthMedicalChanceBonus: 0.55,
} as const satisfies ItemBalanceConfig;
