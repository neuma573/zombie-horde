import { describe, expect, it } from 'vitest';
import { PISTOL_WEAPON, DOUBLE_BARREL_SHOTGUN_WEAPON } from '../../config/weaponConfig';
import { WeaponSystem } from '../../systems/WeaponSystem';

describe('Last Stand weapon rules', () => {
  it('preserves an empty first slot and equips the selected second slot', () => {
    const weapon = new WeaponSystem(PISTOL_WEAPON, {}, { unlimitedReserve: true, loadout: [null, PISTOL_WEAPON] });
    expect(weapon.getInventory().slots[0]).toBeNull();
    expect(weapon.getInventory().activeSlot).toBe(1);
    expect(weapon.getDefinition().id).toBe('pistol');
  });
  it.each([PISTOL_WEAPON, DOUBLE_BARREL_SHOTGUN_WEAPON])('requires timed reloads for $id despite unlimited reserves', definition => {
    const weapon = new WeaponSystem(definition, {}, { unlimitedReserve: true });
    for (let i = 0; i < definition.config.magazineSize; i++) {
      expect(weapon.fire()).toBe(true);
      weapon.update(definition.config.fireIntervalMs);
    }
    expect(weapon.getState().magazineAmmo).toBe(0);
    expect(weapon.fire()).toBe(false);
    weapon.reload();
    weapon.update(definition.config.reloadDurationMs - 1);
    expect(weapon.fire()).toBe(false);
    weapon.update(1);
    expect(weapon.getState().magazineAmmo).toBe(definition.config.magazineSize);
    expect(weapon.getState().reserveAmmo).toBe(Infinity);
    expect(weapon.fire()).toBe(true);
  });
  it('keeps unlimited reserves when switching firearms', () => {
    const weapon = new WeaponSystem(PISTOL_WEAPON, {}, {
      unlimitedReserve: true, loadout: [PISTOL_WEAPON, DOUBLE_BARREL_SHOTGUN_WEAPON],
    });
    weapon.fire();
    weapon.selectSlot(1);
    weapon.fire();
    weapon.selectSlot(0);
    expect(weapon.getState().magazineAmmo).toBe(PISTOL_WEAPON.config.magazineSize - 1);
    expect(weapon.getState().reserveAmmo).toBe(Infinity);
  });
  it('keeps Horde ammunition finite by default', () => {
    const weapon = new WeaponSystem(PISTOL_WEAPON, { pistolAmmo: 0 });
    weapon.fire();
    weapon.reload();
    expect(weapon.getState().reloadRemainingMs).toBeNull();
    expect(weapon.getState().reserveAmmo).toBe(0);
  });
});
