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
    })).toEqual({
      current: expectedAmmo,
      capacity: expectedAmmo,
    });
  });

  it('triggers emergency supply immediately only when no supply is active', () => {
    const initial = createSupplyTriggerState();
    const emergency = resolveSupplyTrigger(initial, {
      activeSupply: false,
      waveCleared: false,
      allAmmoDepleted: true,
      ammoRatio: 0,
      healthRatio: 1,
      randomValue: 1,
    }, SUPPLY_DROP_BALANCE);
    const blocked = resolveSupplyTrigger(initial, {
      activeSupply: true,
      waveCleared: true,
      allAmmoDepleted: true,
      ammoRatio: 0,
      healthRatio: 0,
      randomValue: 0,
    }, SUPPLY_DROP_BALANCE);

    expect(emergency.kind).toBe('emergency');
    expect(blocked.kind).toBeNull();
  });

  it('raises normal supply chance for low ammo, critical health, and consecutive misses', () => {
    const healthy = resolveSupplyTrigger(createSupplyTriggerState(), {
      activeSupply: false,
      waveCleared: true,
      allAmmoDepleted: false,
      ammoRatio: 1,
      healthRatio: 1,
      randomValue: 0.99,
    }, SUPPLY_DROP_BALANCE);
    const needy = resolveSupplyTrigger({ consecutiveMisses: 2 }, {
      activeSupply: false,
      waveCleared: true,
      allAmmoDepleted: false,
      ammoRatio: 0.05,
      healthRatio: 0.2,
      randomValue: 0.5,
    }, SUPPLY_DROP_BALANCE);

    expect(healthy.kind).toBeNull();
    expect(healthy.state.consecutiveMisses).toBe(1);
    expect(needy.chance).toBeGreaterThan(healthy.chance);
    expect(needy.kind).toBe('normal');
    expect(needy.state.consecutiveMisses).toBe(0);
  });
});