import { describe, expect, it } from 'vitest';

import { createOwnedWeapon } from '../../logic/weapon';
import { BURST_RIFLE_WEAPON, PISTOL_WEAPON } from '../../config/weaponConfig';
import { WeaponSystem } from '../../systems/WeaponSystem';

describe('WeaponSystem', () => {
  it('stacks reserve ammunition without a maximum holding limit', () => {
    const system = new WeaponSystem(PISTOL_WEAPON, { pistolAmmo: 90 });

    expect(system.addReserveAmmo('pistolAmmo', 68)).toBe(68);
    expect(system.getAmmoReserves().pistolAmmo).toBe(158);
    expect(system.getState().reserveAmmo).toBe(158);
  });

  it('cancels a reload when switching weapons', () => {
    const system = new WeaponSystem(PISTOL_WEAPON);
    system.fire();
    system.reload();
    system.pickup(BURST_RIFLE_WEAPON);
    system.update(1_000);
    system.selectSlot(0);

    expect(system.getState().reloadRemainingMs).toBeNull();
    expect(system.getState().magazineAmmo).toBe(
      PISTOL_WEAPON.config.magazineSize - 1,
    );
  });

  it('does not cancel reload when selecting the already active slot', () => {
    const system = new WeaponSystem(PISTOL_WEAPON);
    system.fire();
    system.reload();
    const reloadRemainingMs = system.getState().reloadRemainingMs;

    system.selectSlot(0);

    expect(system.getState().reloadRemainingMs).toBe(reloadRemainingMs);
  });

  it('does not create reserve ammo when a dropped weapon is picked up', () => {
    const system = new WeaponSystem(PISTOL_WEAPON, {
      pistolAmmo: 0,
      rifleAmmo: 0,
    });
    const fieldRifle = createOwnedWeapon(BURST_RIFLE_WEAPON);

    system.pickupOwned(fieldRifle);

    expect(system.getState().magazineAmmo).toBe(
      BURST_RIFLE_WEAPON.config.magazineSize,
    );
    expect(system.getState().reserveAmmo).toBe(0);
    expect(system.getAmmoReserves()).toEqual({
      pistolAmmo: 0,
      rifleAmmo: 0,
    });
  });

  it('preserves magazine ammo across dropping and picking up a weapon', () => {
    const system = new WeaponSystem(PISTOL_WEAPON);
    system.fire();
    system.pickup(BURST_RIFLE_WEAPON);
    system.selectSlot(0);
    const droppedPistol = system.pickup(BURST_RIFLE_WEAPON);

    expect(droppedPistol?.state.magazineAmmo).toBe(
      PISTOL_WEAPON.config.magazineSize - 1,
    );

    system.pickupOwned(droppedPistol!);
    expect(system.getState().magazineAmmo).toBe(
      PISTOL_WEAPON.config.magazineSize - 1,
    );
  });

  it('emits the remaining rifle burst rounds from elapsed simulation time', () => {
    const system = new WeaponSystem(PISTOL_WEAPON);
    system.pickup(BURST_RIFLE_WEAPON);

    expect(system.fire()).toBe(true);
    expect(system.getState().magazineAmmo).toBe(29);
    expect(system.update(64)).toBe(0);
    expect(system.update(1)).toBe(1);
    expect(system.update(65)).toBe(1);
    expect(system.getState().magazineAmmo).toBe(27);
    expect(system.update(1_000)).toBe(0);
  });

  it('advances cooldown after overdue burst rounds independently of delta chunking', () => {
    const singleUpdate = new WeaponSystem(BURST_RIFLE_WEAPON);
    const splitUpdates = new WeaponSystem(BURST_RIFLE_WEAPON);

    expect(singleUpdate.fire()).toBe(true);
    expect(splitUpdates.fire()).toBe(true);

    expect(singleUpdate.update(1_000)).toBe(2);
    expect(splitUpdates.update(65)).toBe(1);
    expect(splitUpdates.update(65)).toBe(1);
    expect(splitUpdates.update(870)).toBe(0);

    expect(singleUpdate.getState()).toEqual(splitUpdates.getState());
    expect(singleUpdate.getState()).toMatchObject({
      magazineAmmo: 27,
      cooldownRemainingMs: 0,
    });
  });
});