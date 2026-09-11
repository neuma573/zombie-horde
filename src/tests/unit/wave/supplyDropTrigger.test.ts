import { describe, expect, it } from 'vitest';
import { createSupplyTriggerState, resolveSupplyTrigger, totalAvailableAmmo } from '../../../logic/supplyDrop';
import { SUPPLY_DROP_BALANCE } from '../../../config/supplyDropConfig';
import { PISTOL_WEAPON } from '../../../config/weaponConfig';
import { createWeaponInventory, pickupWeapon } from '../../../logic/weapon';

describe('supply trigger rules', () => {
  it('counts shared reserve capacity once for two weapons using the same ammo type', () => {
    const inventory = pickupWeapon(
      createWeaponInventory(PISTOL_WEAPON),
      PISTOL_WEAPON,
    ).state;
    const expectedAmmo = PISTOL_WEAPON.config.magazineSize * 2
      + PISTOL_WEAPON.config.reserveAmmo;

    expect(totalAvailableAmmo(inventory, {
      pistolAmmo: PISTOL_WEAPON.config.reserveAmmo,
      rifleAmmo: 0,
      shotgunAmmo: 0,
    })).toEqual({
      current: expectedAmmo,
      capacity: expectedAmmo,
    });
  });

  it('does not trigger a supply mid-wave even when ammunition is depleted', () => {
    const initial = { consecutiveMisses: 3 };
    const result = resolveSupplyTrigger(initial, {
      activeSupply: false,
      waveCleared: false,
      ammoRatio: 0,
      healthRatio: 0,
      randomValue: 0,
    }, SUPPLY_DROP_BALANCE);

    expect(result).toEqual({ state: initial, shouldDrop: false, chance: 0 });
  });

  it('blocks another supply while one is active', () => {
    const initial = { consecutiveMisses: 3 };
    const result = resolveSupplyTrigger(initial, {
      activeSupply: true,
      waveCleared: true,
      ammoRatio: 0,
      healthRatio: 0,
      randomValue: 0,
    }, SUPPLY_DROP_BALANCE);

    expect(result).toEqual({ state: initial, shouldDrop: false, chance: 0 });
  });

  it('uses the wave-clear probability even when ammunition is depleted', () => {
    const input = {
      activeSupply: false, waveCleared: true, ammoRatio: 0, healthRatio: 1,
    };
    const initial = createSupplyTriggerState();
    const missed = resolveSupplyTrigger(initial, {
      ...input, randomValue: 1,
    }, SUPPLY_DROP_BALANCE);
    const selected = resolveSupplyTrigger(initial, {
      ...input, randomValue: 0,
    }, SUPPLY_DROP_BALANCE);

    expect(missed.shouldDrop).toBe(false);
    expect(missed.state.consecutiveMisses).toBe(1);
    expect(selected.shouldDrop).toBe(true);
    expect(selected.state.consecutiveMisses).toBe(0);
    expect(selected.chance).toBeLessThan(1);
  });

  it('raises normal supply chance for low ammo, critical health, and consecutive misses', () => {
    const healthy = resolveSupplyTrigger(createSupplyTriggerState(), {
      activeSupply: false,
      waveCleared: true,
      ammoRatio: 1,
      healthRatio: 1,
      randomValue: 0.99,
    }, SUPPLY_DROP_BALANCE);
    const needy = resolveSupplyTrigger({ consecutiveMisses: 2 }, {
      activeSupply: false,
      waveCleared: true,
      ammoRatio: 0.05,
      healthRatio: 0.2,
      randomValue: 0.5,
    }, SUPPLY_DROP_BALANCE);

    expect(healthy.shouldDrop).toBe(false);
    expect(healthy.state.consecutiveMisses).toBe(1);
    expect(needy.chance).toBeGreaterThan(healthy.chance);
    expect(needy.shouldDrop).toBe(true);
    expect(needy.state.consecutiveMisses).toBe(0);
  });
});
