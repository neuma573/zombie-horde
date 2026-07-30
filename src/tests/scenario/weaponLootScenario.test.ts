import { describe, expect, it } from 'vitest';

import { BURST_RIFLE_WEAPON, PISTOL_WEAPON, STARTING_AMMO_RESERVES } from '../../config/weaponConfig';
import { WeaponSystem } from '../../systems/WeaponSystem';

describe('weapon loot scenario', () => {
  it('keeps rifle ammunition unavailable until supply loot is collected', () => {
  const weapons = new WeaponSystem(PISTOL_WEAPON, STARTING_AMMO_RESERVES);
  weapons.pickup(BURST_RIFLE_WEAPON);

  expect(weapons.getAmmoReserves()).toEqual({
    pistolAmmo: PISTOL_WEAPON.config.reserveAmmo,
    rifleAmmo: 0,
  });
  expect(weapons.getState().magazineAmmo).toBe(BURST_RIFLE_WEAPON.config.magazineSize);
  expect(weapons.getState().reserveAmmo).toBe(0);
    });
});
