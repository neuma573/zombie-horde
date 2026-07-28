import type { RectangleObstacle } from './obstacleCollision';
import type { Position } from './movement';
import type { SupplyDropKind } from './supplyDrop';
import type { WeaponId } from './weapon';

export type ConsumableItemKind = 'pistolAmmo' | 'rifleAmmo' | 'medical';
export type SupplyLoot = {
  type: 'weapon';
  weaponId: WeaponId;
} | {
  type: 'consumable';
  kind: ConsumableItemKind;
};

export interface ItemBalanceConfig {
  pistolAmmoAmount: number;
  rifleAmmoAmount: number;
  medicalHealingAmount: number;
  pickupRadius: number;
  dropMinimumDistance: number;
  dropMaximumDistance: number;
  dropClearance: number;
  normalMedicalChance: number;
  criticalHealthMedicalChanceBonus: number;
}

export interface SupplyLootConfig {
  rifleUnlockWave: number;
  rifleDropChance: number;
  criticalHealthRatio: number;
  normalMedicalChance: number;
  criticalHealthMedicalChanceBonus: number;
}

export function claimSupplyLoot(released: boolean): {
  released: boolean;
  shouldDrop: boolean;
} {
  return { released: true, shouldDrop: !released };
}

export function selectSupplyLoot(
  kind: SupplyDropKind,
  waveNumber: number,
  healthRatio: number,
  weaponRoll: number,
  medicalRoll: number,
  config: SupplyLootConfig,
): SupplyLoot[] {
  const rifleAvailable = waveNumber >= config.rifleUnlockWave;
  const rifleSelected = rifleAvailable && clamp01(weaponRoll) < config.rifleDropChance;
  const weaponId: WeaponId = rifleSelected ? 'burstRifle' : 'pistol';
  const medicalChance = clamp01(
    config.normalMedicalChance
      + (healthRatio <= config.criticalHealthRatio
        ? config.criticalHealthMedicalChanceBonus
        : 0),
  );
  const includeMedical = kind === 'emergency'
    || clamp01(medicalRoll) < medicalChance;

  return [
    { type: 'weapon', weaponId },
    {
      type: 'consumable',
      kind: rifleSelected ? 'rifleAmmo' : 'pistolAmmo',
    },
    ...(includeMedical
      ? [{ type: 'consumable' as const, kind: 'medical' as const }]
      : []),
  ];
}

export function spreadSupplyLootPositions(
  count: number,
  center: Position,
  bounds: { width: number; height: number },
  obstacles: readonly RectangleObstacle[],
  seed: number,
  config: Pick<
    ItemBalanceConfig,
    'dropMinimumDistance' | 'dropMaximumDistance' | 'dropClearance'
  >,
): Position[] {
  const positions: Position[] = [];
  const safeCount = Math.max(0, Math.floor(count));
  for (let index = 0; index < safeCount; index += 1) {
    const baseAngle = index / Math.max(1, safeCount) * Math.PI * 2;
    let selected: Position | null = null;
    for (let attempt = 0; attempt < 24; attempt += 1) {
      const angleJitter = random01(seed, index * 97 + attempt * 2) - 0.5;
      const distanceRoll = random01(seed, index * 97 + attempt * 2 + 1);
      const angle = baseAngle + angleJitter * Math.PI * 0.7 + attempt * Math.PI / 12;
      const dropDistance = config.dropMinimumDistance
        + (config.dropMaximumDistance - config.dropMinimumDistance) * distanceRoll;
      const candidate = {
        x: center.x + Math.cos(angle) * dropDistance,
        y: center.y + Math.sin(angle) * dropDistance,
      };
      if (isValidDropPosition(candidate, bounds, obstacles, config.dropClearance)) {
        selected = candidate;
        break;
      }
    }
    if (selected) positions.push(selected);
  }
  return positions;
}

export function addClamped(current: number, amount: number, maximum: number): number {
  return Math.min(
    Math.max(0, maximum),
    Math.max(0, current) + Math.max(0, amount),
  );
}

function isValidDropPosition(
  position: Position,
  bounds: { width: number; height: number },
  obstacles: readonly RectangleObstacle[],
  clearance: number,
): boolean {
  if (
    position.x < clearance
    || position.y < clearance
    || position.x > bounds.width - clearance
    || position.y > bounds.height - clearance
  ) {
    return false;
  }
  return !obstacles.some((obstacle) => (
    position.x >= obstacle.x - clearance
    && position.x <= obstacle.x + obstacle.width + clearance
    && position.y >= obstacle.y - clearance
    && position.y <= obstacle.y + obstacle.height + clearance
  ));
}

function random01(seed: number, index: number): number {
  let value = (seed ^ Math.imul(index + 1, 0x9e3779b9)) >>> 0;
  value = Math.imul(value ^ (value >>> 16), 0x21f0aaad);
  value = Math.imul(value ^ (value >>> 15), 0x735a2d97);
  return ((value ^ (value >>> 15)) >>> 0) / 0x1_0000_0000;
}

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, Number.isFinite(value) ? value : 0));
}
