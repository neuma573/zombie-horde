import { describe, expect, it } from 'vitest';

import { createOwnedWeapon, createWeaponInventory, hasLoadedWeaponPickup, pickupWeapon, selectWeaponSlot, shouldAutoPickupWeapon, shouldShowFieldWeaponInfo, WEAPON_RARITIES, withWeaponRarity } from '../../../logic/weapon';
import { BURST_RIFLE_WEAPON, PISTOL_WEAPON } from '../../../config/weaponConfig';

describe('weapon inventory', () => {
  it('starts with a pistol and adds a pickup to the empty second slot', () => {
    const initial = createWeaponInventory(PISTOL_WEAPON);
    const pickup = pickupWeapon(initial, BURST_RIFLE_WEAPON);

    expect(initial.slots[0]?.definition.id).toBe('pistol');
    expect(initial.slots[1]).toBeNull();
    expect(pickup.state.slots.map((slot) => slot?.definition.id)).toEqual([
      'pistol',
      'burstRifle',
    ]);
    expect(pickup.state.activeSlot).toBe(1);
    expect(pickup.replaced).toBeNull();
  });

  it('replaces only the active weapon when both slots are occupied', () => {
    const full = pickupWeapon(
      createWeaponInventory(PISTOL_WEAPON),
      BURST_RIFLE_WEAPON,
    ).state;
    const selectedPistol = selectWeaponSlot(full, 0);
    const replacement = pickupWeapon(selectedPistol, BURST_RIFLE_WEAPON);

    expect(replacement.replaced?.definition.id).toBe('pistol');
    expect(replacement.state.slots.map((slot) => slot?.definition.id)).toEqual([
      'burstRifle',
      'burstRifle',
    ]);
  });

  it('automatically picks up on contact only while a weapon slot is empty', () => {
    const initial = createWeaponInventory(PISTOL_WEAPON);
    const full = pickupWeapon(initial, BURST_RIFLE_WEAPON).state;

    expect(shouldAutoPickupWeapon(initial, true)).toBe(true);
    expect(shouldAutoPickupWeapon(initial, false)).toBe(false);
    expect(shouldAutoPickupWeapon(full, true)).toBe(false);
  });

  it('treats only loaded ground weapons as immediate ammunition recovery', () => {
    const loaded = createOwnedWeapon(BURST_RIFLE_WEAPON);
    const empty = {
      ...loaded,
      state: { ...loaded.state, magazineAmmo: 0 },
    };

    expect(hasLoadedWeaponPickup([loaded])).toBe(true);
    expect(hasLoadedWeaponPickup([empty])).toBe(false);
    expect(hasLoadedWeaponPickup([])).toBe(false);
  });

  it('shows field weapon info only with two weapons and the correct input trigger', () => {
    expect(shouldShowFieldWeaponInfo(false, false, true, true)).toBe(false);
    expect(shouldShowFieldWeaponInfo(false, true, true, false)).toBe(false);
    expect(shouldShowFieldWeaponInfo(true, false, false, true)).toBe(true);
    expect(shouldShowFieldWeaponInfo(true, false, true, false)).toBe(false);
    expect(shouldShowFieldWeaponInfo(true, true, true, false)).toBe(true);
    expect(shouldShowFieldWeaponInfo(true, true, false, true)).toBe(false);
  });

  it('supports every rarity independently for each weapon type', () => {
    for (const rarity of WEAPON_RARITIES) {
      expect(withWeaponRarity(PISTOL_WEAPON, rarity)).toMatchObject({
        id: 'pistol',
        rarity,
      });
      expect(withWeaponRarity(BURST_RIFLE_WEAPON, rarity)).toMatchObject({
        id: 'burstRifle',
        rarity,
      });
    }
  });
});