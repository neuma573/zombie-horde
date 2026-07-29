import type { RectangleObstacle } from './obstacleCollision';
import type { Position } from './movement';
import type { SupplyDropKind } from './supplyDrop';
import type { AmmoType, WeaponId } from './weapon';

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
  dropMinimumSpacing: number;
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
    | 'dropMinimumDistance'
    | 'dropMaximumDistance'
    | 'dropMinimumSpacing'
    | 'dropClearance'
  >,
): Position[] {
  const positions: Position[] = [];
  const safeCount = Math.max(0, Math.floor(count));
  const minimumSpacing = Math.max(0, config.dropMinimumSpacing);
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
      const clearsSelectedPositions = positions.every((position) => (
        Math.hypot(candidate.x - position.x, candidate.y - position.y)
          >= minimumSpacing
      ));
      if (
        clearsSelectedPositions
        && isValidDropPosition(candidate, bounds, obstacles, config.dropClearance)
      ) {
        selected = candidate;
        break;
      }
    }
    if (selected) positions.push(selected);
  }

  const clearsExisting = (candidate: Position): boolean => positions.every((position) => (
    Math.hypot(candidate.x - position.x, candidate.y - position.y)
      >= minimumSpacing
  ));
  const maximumRadius = Math.max(0, config.dropMaximumDistance);
  const isWithinMaximumRadius = (candidate: Position): boolean => (
    Math.hypot(candidate.x - center.x, candidate.y - center.y) <= maximumRadius
  );
  const radiusStep = Math.max(16, minimumSpacing, config.dropClearance * 2);
  const angleOffset = random01(seed, 0x51f15e) * Math.PI * 2;
  for (
    let radius = Math.max(0, config.dropMinimumDistance);
    positions.length < safeCount && radius <= maximumRadius;
    radius += radiusStep
  ) {
    for (let index = 0; index < 48 && positions.length < safeCount; index += 1) {
      const angle = angleOffset + index / 48 * Math.PI * 2;
      const candidate = {
        x: center.x + Math.cos(angle) * radius,
        y: center.y + Math.sin(angle) * radius,
      };
      if (
        clearsExisting(candidate)
        && isValidDropPosition(candidate, bounds, obstacles, config.dropClearance)
      ) {
        positions.push(candidate);
      }
    }
  }

  const gridStep = Math.max(16, minimumSpacing, config.dropClearance * 2);
  for (
    let y = config.dropClearance;
    positions.length < safeCount && y <= bounds.height - config.dropClearance;
    y += gridStep
  ) {
    for (
      let x = config.dropClearance;
      positions.length < safeCount && x <= bounds.width - config.dropClearance;
      x += gridStep
    ) {
      const candidate = { x, y };
      if (
        isWithinMaximumRadius(candidate)
        && clearsExisting(candidate)
        && isValidDropPosition(candidate, bounds, obstacles, config.dropClearance)
      ) {
        positions.push(candidate);
      }
    }
  }
  return positions;
}

export function addClamped(current: number, amount: number, maximum: number): number {
  return Math.min(
    Math.max(0, maximum),
    Math.max(0, current) + Math.max(0, amount),
  );
}

export function canCollectConsumable(
  kind: ConsumableItemKind,
  currentHealth: number,
  maximumHealth: number,
  medicalHealingAmount: number,
): boolean {
  return kind !== 'medical'
    || Math.max(0, currentHealth) + Math.max(0, medicalHealingAmount)
      <= Math.max(0, maximumHealth);
}

export function hasUsableAmmoPickup(
  pickupKinds: readonly ConsumableItemKind[],
  ownedAmmoTypes: ReadonlySet<AmmoType>,
): boolean {
  return pickupKinds.some((kind) => (
    kind !== 'medical' && ownedAmmoTypes.has(kind)
  ));
}

export function revalidatePickupPosition(
  position: Position,
  bounds: { width: number; height: number },
  obstacles: readonly RectangleObstacle[],
  clearance: number,
): Position {
  const safeClearance = Math.min(
    Math.max(0, clearance),
    Math.max(0, bounds.width) / 2,
    Math.max(0, bounds.height) / 2,
  );
  const clamp = (candidate: Position): Position => ({
    x: Math.min(
      Math.max(safeClearance, bounds.width - safeClearance),
      Math.max(safeClearance, candidate.x),
    ),
    y: Math.min(
      Math.max(safeClearance, bounds.height - safeClearance),
      Math.max(safeClearance, candidate.y),
    ),
  });
  const constrained = clamp(position);
  if (isValidDropPosition(constrained, bounds, obstacles, safeClearance)) {
    return constrained;
  }

  const step = Math.max(16, safeClearance);
  const maximumRadius = Math.hypot(bounds.width, bounds.height);
  for (let radius = step; radius <= maximumRadius; radius += step) {
    for (let index = 0; index < 16; index += 1) {
      const angle = index / 16 * Math.PI * 2;
      const candidate = clamp({
        x: constrained.x + Math.cos(angle) * radius,
        y: constrained.y + Math.sin(angle) * radius,
      });
      if (isValidDropPosition(candidate, bounds, obstacles, safeClearance)) {
        return candidate;
      }
    }
  }
  return constrained;
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
