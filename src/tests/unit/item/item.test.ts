import { describe, expect, it } from 'vitest';

import { PISTOL_WEAPON, BURST_RIFLE_WEAPON, DOUBLE_BARREL_SHOTGUN_WEAPON, POLICE_BATON_WEAPON } from '../../../config/weaponConfig';
import { createOwnedWeapon, type WeaponInventoryState } from '../../../logic/weapon';
import { ITEM_BALANCE_CONFIG } from '../../../config/itemConfig';
import { SUPPLY_DROP_BALANCE } from '../../../config/supplyDropConfig';
import {
  addClamped,
  canCollectConsumable,
  claimSupplyLoot,
  hasUsableAmmoPickup,
  revalidatePickupPosition,
  selectSupplyLoot,
  spreadSupplyLootPositions,
} from '../../../logic/item';

const LOOT_CONFIG = {
  rifleUnlockWave: SUPPLY_DROP_BALANCE.rifleUnlockWave,
  rifleDropChance: SUPPLY_DROP_BALANCE.rifleDropChance,
  shotgunUnlockWave: SUPPLY_DROP_BALANCE.shotgunUnlockWave,
  shotgunDropChance: SUPPLY_DROP_BALANCE.shotgunDropChance,
  criticalHealthRatio: SUPPLY_DROP_BALANCE.criticalHealthRatio,
  normalMedicalChance: ITEM_BALANCE_CONFIG.normalMedicalChance,
  criticalHealthMedicalChanceBonus: ITEM_BALANCE_CONFIG.criticalHealthMedicalChanceBonus,
};

const EMPTY_INVENTORY: WeaponInventoryState = { slots: [null, null], activeSlot: 0 };
const EMPTY_RESERVES = { pistolAmmo: 0, rifleAmmo: 0, shotgunAmmo: 0 };

describe('supply loot', () => {
  it('allows a crate to release its contents only once', () => {
    const first = claimSupplyLoot(false);
    const repeated = claimSupplyLoot(first.released);

    expect(first.shouldDrop).toBe(true);
    expect(repeated.shouldDrop).toBe(false);
  });

  it('limits weapon drops to pistols before wave two', () => {
    const loot = selectSupplyLoot(1, 1, 0, 1, LOOT_CONFIG, EMPTY_INVENTORY, EMPTY_RESERVES);
    expect(loot[0]).toEqual({ type: 'weapon', weaponId: 'pistol' });
    expect(loot).toContainEqual({ type: 'consumable', kind: 'pistolAmmo' });
  });

  it('uses the configured rifle probability starting at wave two', () => {
    const rifle = selectSupplyLoot(2, 1, 0, 1, LOOT_CONFIG, EMPTY_INVENTORY, EMPTY_RESERVES);
    const pistol = selectSupplyLoot(2, 1, 1, 1, LOOT_CONFIG, EMPTY_INVENTORY, EMPTY_RESERVES);

    expect(rifle[0]).toEqual({ type: 'weapon', weaponId: 'burstRifle' });
    expect(rifle).toContainEqual({ type: 'consumable', kind: 'rifleAmmo' });
    expect(pistol[0]).toEqual({ type: 'weapon', weaponId: 'pistol' });
  });

  it('drops the shotgun from wave two and supplies matching ammo when no gun is owned', () => {
    const shotgunRoll = SUPPLY_DROP_BALANCE.rifleDropChance + 0.01;
    const loot = selectSupplyLoot(2, 1, shotgunRoll, 1, LOOT_CONFIG, EMPTY_INVENTORY, EMPTY_RESERVES);

    expect(loot[0]).toEqual({
      type: 'weapon',
      weaponId: 'doubleBarrelShotgun',
    });
    expect(loot).toContainEqual({ type: 'consumable', kind: 'shotgunAmmo' });
  });

  it.each([
    [SUPPLY_DROP_BALANCE.rifleDropChance - 0.0001, 'burstRifle'],
    [SUPPLY_DROP_BALANCE.rifleDropChance, 'doubleBarrelShotgun'],
    [SUPPLY_DROP_BALANCE.rifleDropChance + SUPPLY_DROP_BALANCE.shotgunDropChance, 'pistol'],
  ] as const)('selects the weapon at probability boundary %s', (roll, weaponId) => {
    const loot = selectSupplyLoot(2, 1, roll, 1, LOOT_CONFIG, EMPTY_INVENTORY, EMPTY_RESERVES);
    expect(loot[0]).toEqual({ type: 'weapon', weaponId });
  });

  it('includes loaded ammunition when comparing guns with different reserves', () => {
    const inventory: WeaponInventoryState = { slots: [createOwnedWeapon(PISTOL_WEAPON), createOwnedWeapon(BURST_RIFLE_WEAPON)], activeSlot: 0 };
    inventory.slots[1]!.state.magazineAmmo = 0;
    const loot = selectSupplyLoot(2, 1, 0.99, 1, LOOT_CONFIG, inventory,
      { pistolAmmo: 0, rifleAmmo: 5, shotgunAmmo: 0 });
    expect(loot).toEqual([{ type: 'consumable', kind: 'rifleAmmo' }]);
  });

  it('reselects ammunition from the inventory at each loot release', () => {
    const inventory: WeaponInventoryState = { slots: [createOwnedWeapon(PISTOL_WEAPON), createOwnedWeapon(BURST_RIFLE_WEAPON)], activeSlot: 0 };
    const before = selectSupplyLoot(2, 1, 0.99, 1, LOOT_CONFIG, inventory, EMPTY_RESERVES);
    inventory.slots[1]!.state.magazineAmmo = 0;
    const after = selectSupplyLoot(2, 1, 0.99, 1, LOOT_CONFIG, inventory, EMPTY_RESERVES);
    expect(before).toEqual([{ type: 'consumable', kind: 'pistolAmmo' }]);
    expect(after).toEqual([{ type: 'consumable', kind: 'rifleAmmo' }]);
  });

  it('omits a pistol owned in the inactive slot without rerolling another weapon', () => {
    const inventory: WeaponInventoryState = { slots: [createOwnedWeapon(POLICE_BATON_WEAPON), createOwnedWeapon(PISTOL_WEAPON)], activeSlot: 0 };
    const loot = selectSupplyLoot(2, 1, 0.99, 1, LOOT_CONFIG, inventory, EMPTY_RESERVES);
    expect(loot).toEqual([{ type: 'consumable', kind: 'pistolAmmo' }]);
  });

  it('supplies both the dropped weapon and the scarcer owned ammunition', () => {
    const inventory: WeaponInventoryState = { slots: [createOwnedWeapon(PISTOL_WEAPON), createOwnedWeapon(BURST_RIFLE_WEAPON)], activeSlot: 0 };
    inventory.slots[1]!.state.magazineAmmo = 2;
    const loot = selectSupplyLoot(2, 1, 0.3, 1, LOOT_CONFIG, inventory,
      { pistolAmmo: 20, rifleAmmo: 1, shotgunAmmo: 0 });
    expect(loot).toContainEqual({ type: 'weapon', weaponId: 'doubleBarrelShotgun' });
    expect(loot).toContainEqual({ type: 'consumable', kind: 'rifleAmmo' });
    expect(loot).toContainEqual({ type: 'consumable', kind: 'shotgunAmmo' });
    expect(loot).not.toContainEqual({ type: 'consumable', kind: 'pistolAmmo' });
  });

  it.each([
    [0, 'burstRifle', 'rifleAmmo'],
    [SUPPLY_DROP_BALANCE.rifleDropChance, 'doubleBarrelShotgun', 'shotgunAmmo'],
  ] as const)('includes matching ammunition for %s while a pistol is owned', (roll, weaponId, kind) => {
    const inventory: WeaponInventoryState = {
      slots: [createOwnedWeapon(PISTOL_WEAPON), null], activeSlot: 0,
    };
    const loot = selectSupplyLoot(2, 1, roll, 1, LOOT_CONFIG, inventory, EMPTY_RESERVES);

    expect(loot).toEqual([
      { type: 'weapon', weaponId },
      { type: 'consumable', kind: 'pistolAmmo' },
      { type: 'consumable', kind },
    ]);
  });

  it('includes pistol ammunition when dropping a pistol for a rifle owner', () => {
    const inventory: WeaponInventoryState = {
      slots: [createOwnedWeapon(BURST_RIFLE_WEAPON), null], activeSlot: 0,
    };
    const loot = selectSupplyLoot(2, 1, 1, 1, LOOT_CONFIG, inventory, EMPTY_RESERVES);

    expect(loot).toEqual([
      { type: 'weapon', weaponId: 'pistol' },
      { type: 'consumable', kind: 'rifleAmmo' },
      { type: 'consumable', kind: 'pistolAmmo' },
    ]);
  });

  it('drops one ammunition bundle when the dropped gun uses the scarcest owned type', () => {
    const inventory: WeaponInventoryState = {
      slots: [createOwnedWeapon(BURST_RIFLE_WEAPON), null], activeSlot: 0,
    };
    const loot = selectSupplyLoot(2, 1, 0, 1, LOOT_CONFIG, inventory, EMPTY_RESERVES);

    expect(loot).toEqual([
      { type: 'weapon', weaponId: 'burstRifle' },
      { type: 'consumable', kind: 'rifleAmmo' },
    ]);
  });

  it('counts loaded rounds and chooses the active gun when totals tie', () => {
    const inventory: WeaponInventoryState = { slots: [createOwnedWeapon(PISTOL_WEAPON), createOwnedWeapon(DOUBLE_BARREL_SHOTGUN_WEAPON)], activeSlot: 1 };
    inventory.slots[0]!.state.magazineAmmo = 2;
    const loot = selectSupplyLoot(2, 1, 0.99, 1, LOOT_CONFIG, inventory, EMPTY_RESERVES);
    expect(loot).toEqual([{ type: 'consumable', kind: 'shotgunAmmo' }]);
  });

  it('ignores empty reserves for unowned guns and melee weapons', () => {
    const inventory: WeaponInventoryState = { slots: [createOwnedWeapon(POLICE_BATON_WEAPON), createOwnedWeapon(BURST_RIFLE_WEAPON)], activeSlot: 0 };
    const loot = selectSupplyLoot(2, 1, 0.99, 1, LOOT_CONFIG, inventory,
      { pistolAmmo: 0, rifleAmmo: 100, shotgunAmmo: 0 });
    expect(loot).toContainEqual({ type: 'consumable', kind: 'rifleAmmo' });
    expect(loot).toContainEqual({ type: 'weapon', weaponId: 'pistol' });
  });

  it('boosts medical supply chance for critical health without guaranteeing a drop', () => {
    const healthy = selectSupplyLoot(3, 1, 1, 0.8, LOOT_CONFIG, EMPTY_INVENTORY, EMPTY_RESERVES);
    const critical = selectSupplyLoot(3, 0.2, 1, 0.8, LOOT_CONFIG, EMPTY_INVENTORY, EMPTY_RESERVES);
    const missed = selectSupplyLoot(3, 0.2, 1, 1, LOOT_CONFIG, EMPTY_INVENTORY, EMPTY_RESERVES);

    expect(healthy).not.toContainEqual({ type: 'consumable', kind: 'medical' });
    expect(critical).toContainEqual({ type: 'consumable', kind: 'medical' });
    expect(missed).not.toContainEqual({ type: 'consumable', kind: 'medical' });
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
  it('clamps healing to the configured maximum health', () => {
    expect(addClamped(80, ITEM_BALANCE_CONFIG.medicalHealingAmount, 100)).toBe(100);
  });

  it('collects medical pickups whenever health is below the maximum', () => {
    expect(canCollectConsumable('medical', 100, 100)).toBe(false);
    expect(canCollectConsumable('medical', 99, 100)).toBe(true);
    expect(canCollectConsumable('medical', 66, 100)).toBe(true);
    expect(canCollectConsumable('medical', 65, 100)).toBe(true);
    expect(canCollectConsumable('pistolAmmo', 100, 100)).toBe(true);
  });

  it('heals one missing health point and leaves subsequent medical pickups uncollected', () => {
    const healingAmount = ITEM_BALANCE_CONFIG.medicalHealingAmount;
    let health = 99;

    expect(canCollectConsumable('medical', health, 100)).toBe(true);
    health = addClamped(health, healingAmount, 100);

    expect(health).toBe(100);
    expect(canCollectConsumable('medical', health, 100)).toBe(false);
  });

  it('rechecks medical eligibility after each heal', () => {
    const healingAmount = ITEM_BALANCE_CONFIG.medicalHealingAmount;
    let health = 30;

    expect(canCollectConsumable('medical', health, 100)).toBe(true);
    health = addClamped(health, healingAmount, 100);
    expect(canCollectConsumable('medical', health, 100)).toBe(true);
    health = addClamped(health, healingAmount, 100);
    expect(canCollectConsumable('medical', health, 100)).toBe(false);
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
