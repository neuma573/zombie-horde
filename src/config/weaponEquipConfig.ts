import type { WeaponId } from '../logic/weapon';

export const WEAPON_EQUIP_CONFIG = {
  pistol: { durationMs: 240, startRotation: 0.9 },
  policeBaton: { durationMs: 260, startRotation: 0.7 },
  burstRifle: { durationMs: 340, startRotation: 1.1 },
  doubleBarrelShotgun: { durationMs: 360, startRotation: 1.1 },
} as const satisfies Record<WeaponId, { durationMs: number; startRotation: number }>;
