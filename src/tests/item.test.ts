import { describe, expect, it } from 'vitest';

import { ITEM_BALANCE_CONFIG } from '../config/itemConfig';
import { SUPPLY_DROP_BALANCE } from '../config/supplyDropConfig';
import {
  addClamped,
  canCollectConsumable,
  claimSupplyLoot,
  hasUsableAmmoPickup,
  revalidatePickupPosition,
  selectSupplyLoot,
  spreadSupplyLootPositions,
} from '../logic/item';

const LOOT_CONFIG = {
  rifleUnlockWave: SUPPLY_DROP_BALANCE.rifleUnlockWave,
  rifleDropChance: SUPPLY_DROP_BALANCE.rifleDropChance,
  criticalHealthRatio: SUPPLY_DROP_BALANCE.criticalHealthRatio,
  normalMedicalChance: ITEM_BALANCE_CONFIG.normalMedicalChance,
  criticalHealthMedicalChanceBonus: ITEM_BALANCE_CONFIG.criticalHealthMedicalChanceBonus,
};

describe('supply loot', () => {
  it('allows a crate to release its contents only once', () => {
    const first = claimSupplyLoot(false);
    const repeated = claimSupplyLoot(first.released);

    expect(first.shouldDrop).toBe(true);
    expect(repeated.shouldDrop).toBe(false);
  });

  it('limits weapon drops to pistols through wave five', () => {
    for (let wave = 1; wave <= 5; wave += 1) {
      const loot = selectSupplyLoot('normal', wave, 1, 0, 1, LOOT_CONFIG);
      expect(loot[0]).toEqual({ type: 'weapon', weaponId: 'pistol' });
      expect(loot).toContainEqual({ type: 'consumable', kind: 'pistolAmmo' });
    }
  });

  it('uses the configured rifle probability starting at wave six', () => {
    const rifle = selectSupplyLoot('normal', 6, 1, 0, 1, LOOT_CONFIG);
    const pistol = selectSupplyLoot('normal', 6, 1, 1, 1, LOOT_CONFIG);

    expect(SUPPLY_DROP_BALANCE.rifleDropChance).toBeGreaterThan(0);
    expect(rifle[0]).toEqual({ type: 'weapon', weaponId: 'burstRifle' });
    expect(rifle).toContainEqual({ type: 'consumable', kind: 'rifleAmmo' });
    expect(pistol[0]).toEqual({ type: 'weapon', weaponId: 'pistol' });
  });

  it('guarantees medical supplies for emergency drops and boosts critical-health drops', () => {
    const healthy = selectSupplyLoot('normal', 3, 1, 1, 0.8, LOOT_CONFIG);
    const critical = selectSupplyLoot('normal', 3, 0.2, 1, 0.8, LOOT_CONFIG);
    const emergency = selectSupplyLoot('emergency', 3, 1, 1, 1, LOOT_CONFIG);

    expect(healthy).not.toContainEqual({ type: 'consumable', kind: 'medical' });
    expect(critical).toContainEqual({ type: 'consumable', kind: 'medical' });
    expect(emergency).toContainEqual({ type: 'consumable', kind: 'medical' });
  });

  it('spreads items around the crate without overlap, obstacles, or map overflow', () => {
    const center = { x: 400, y: 300 };
    const obstacle = { x: 430, y: 260, width: 90, height: 80 };
    const positions = spreadSupplyLootPositions(
      3,
      center,
      { width: 800, height: 600 },
      [obstacle],
      42,
      ITEM_BALANCE_CONFIG,
    );

    expect(positions).toHaveLength(3);
    expect(new Set(positions.map(({ x, y }) => `${x}:${y}`)).size).toBe(3);
    for (const position of positions) {
      const distance = Math.hypot(position.x - center.x, position.y - center.y);
      expect(distance).toBeGreaterThanOrEqual(ITEM_BALANCE_CONFIG.dropMinimumDistance);
      expect(distance).toBeLessThanOrEqual(ITEM_BALANCE_CONFIG.dropMaximumDistance);
      expect(position.x).toBeGreaterThan(ITEM_BALANCE_CONFIG.dropClearance);
      expect(position.x).toBeLessThan(800 - ITEM_BALANCE_CONFIG.dropClearance);
      expect(
        position.x >= obstacle.x - ITEM_BALANCE_CONFIG.dropClearance
        && position.x <= obstacle.x + obstacle.width + ITEM_BALANCE_CONFIG.dropClearance
        && position.y >= obstacle.y - ITEM_BALANCE_CONFIG.dropClearance
        && position.y <= obstacle.y + obstacle.height + ITEM_BALANCE_CONFIG.dropClearance,
      ).toBe(false);
    }
  });

  it('keeps seed 223 loot centers farther apart than their rendered glows', () => {
    const positions = spreadSupplyLootPositions(
      3,
      { x: 400, y: 300 },
      { width: 800, height: 600 },
      [],
      223,
      ITEM_BALANCE_CONFIG,
    );

    expect(positions).toHaveLength(3);
    for (let left = 0; left < positions.length; left += 1) {
      for (let right = left + 1; right < positions.length; right += 1) {
        expect(Math.hypot(
          positions[left].x - positions[right].x,
          positions[left].y - positions[right].y,
        )).toBeGreaterThanOrEqual(ITEM_BALANCE_CONFIG.dropMinimumSpacing);
      }
    }
  });

  it('retains every selected loot position near a constrained map corner', () => {
    const positions = spreadSupplyLootPositions(
      3,
      { x: 40, y: 40 },
      { width: 320, height: 320 },
      [{ x: 90, y: 0, width: 230, height: 190 }],
      91,
      ITEM_BALANCE_CONFIG,
    );

    expect(positions).toHaveLength(3);
    for (let left = 0; left < positions.length; left += 1) {
      expect(Math.hypot(
        positions[left].x - 40,
        positions[left].y - 40,
      )).toBeLessThanOrEqual(ITEM_BALANCE_CONFIG.dropMaximumDistance);
      for (let right = left + 1; right < positions.length; right += 1) {
        expect(Math.hypot(
          positions[left].x - positions[right].x,
          positions[left].y - positions[right].y,
        )).toBeGreaterThanOrEqual(ITEM_BALANCE_CONFIG.dropMinimumSpacing);
      }
    }
  });
});

describe('item effects', () => {
  it('configures pistol ammunition pickups to grant 68 rounds', () => {
    expect(ITEM_BALANCE_CONFIG.pistolAmmoAmount).toBe(68);
  });

  it('clamps healing to the configured maximum health', () => {
    expect(addClamped(80, ITEM_BALANCE_CONFIG.medicalHealingAmount, 100)).toBe(100);
  });

  it('collects medical pickups only when the full healing amount can be used', () => {
    const healingAmount = ITEM_BALANCE_CONFIG.medicalHealingAmount;

    expect(canCollectConsumable('medical', 100, 100, healingAmount)).toBe(false);
    expect(canCollectConsumable('medical', 99, 100, healingAmount)).toBe(false);
    expect(canCollectConsumable('medical', 65, 100, healingAmount)).toBe(true);
    expect(canCollectConsumable('pistolAmmo', 100, 100, healingAmount)).toBe(true);
  });

  it('rechecks medical eligibility after each heal', () => {
    const healingAmount = ITEM_BALANCE_CONFIG.medicalHealingAmount;
    let health = 30;

    expect(canCollectConsumable('medical', health, 100, healingAmount)).toBe(true);
    health = addClamped(health, healingAmount, 100);
    expect(canCollectConsumable('medical', health, 100, healingAmount)).toBe(true);
    health = addClamped(health, healingAmount, 100);
    expect(canCollectConsumable('medical', health, 100, healingAmount)).toBe(false);
  });

  it('counts only ammunition pickups usable by the current inventory', () => {
    expect(hasUsableAmmoPickup(
      ['rifleAmmo', 'medical'],
      new Set(['pistolAmmo']),
    )).toBe(false);
    expect(hasUsableAmmoPickup(
      ['rifleAmmo', 'medical'],
      new Set(['pistolAmmo', 'rifleAmmo']),
    )).toBe(true);
  });

  it('moves pickups from a removed map strip into an obstacle-free playable position', () => {
    const obstacle = { x: 720, y: 400, width: 80, height: 200 };
    const position = revalidatePickupPosition(
      { x: 1_100, y: 500 },
      { width: 800, height: 700 },
      [obstacle],
      30,
    );

    expect(position.x).toBeGreaterThanOrEqual(30);
    expect(position.x).toBeLessThanOrEqual(770);
    expect(position.y).toBeGreaterThanOrEqual(30);
    expect(position.y).toBeLessThanOrEqual(670);
    expect(
      position.x >= obstacle.x - 30
      && position.x <= obstacle.x + obstacle.width + 30
      && position.y >= obstacle.y - 30
      && position.y <= obstacle.y + obstacle.height + 30,
    ).toBe(false);
  });
});
