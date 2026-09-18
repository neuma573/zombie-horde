import { describe, expect, it } from 'vitest';
import { LastStandArmory } from '../../systems/LastStandArmory';

describe('Last Stand armory', () => {
  it('starts with one owned pistol, no selection and two empty defense slots', () => {
    const armory = new LastStandArmory();
    expect(armory.getState()).toEqual({ owned: ['pistol'], slots: [null, null], selectedWeapon: null });
    expect(armory.canStartDefense()).toBe(false);
  });
  it('requires rack selection before assigning the pistol to either slot', () => {
    const armory = new LastStandArmory();
    expect(armory.clickSlot(1)).toBe(false);
    expect(armory.selectWeapon('pistol')).toBe(true);
    expect(armory.getState().selectedWeapon).toBe('pistol');
    expect(armory.getState().slots).toEqual([null, null]);
    expect(armory.canStartDefense()).toBe(false);
    expect(armory.clickSlot(1)).toBe(true);
    expect(armory.getState().slots).toEqual([null, 'pistol']);
    expect(armory.getState().selectedWeapon).toBeNull();
    expect(armory.canStartDefense()).toBe(true);
  });
  it('prevents selecting or duplicating an assigned weapon', () => {
    const armory = new LastStandArmory();
    armory.selectWeapon('pistol');
    armory.clickSlot(1);
    expect(armory.selectWeapon('pistol')).toBe(false);
    expect(armory.clickSlot(0)).toBe(false);
    expect(armory.getState().slots).toEqual([null, 'pistol']);
  });
  it('removes a clicked weapon and requires selecting it again before reassignment', () => {
    const armory = new LastStandArmory();
    armory.selectWeapon('pistol');
    armory.clickSlot(1);
    expect(armory.clickSlot(1)).toBe(true);
    expect(armory.getState().slots).toEqual([null, null]);
    expect(armory.canStartDefense()).toBe(false);
    expect(armory.clickSlot(0)).toBe(false);
    expect(armory.selectWeapon('pistol')).toBe(true);
    expect(armory.clickSlot(0)).toBe(true);
    expect(armory.getState().slots).toEqual(['pistol', null]);
    expect(armory.canStartDefense()).toBe(true);
  });
  it('rejects weapons that are not owned without changing the loadout', () => {
    const armory = new LastStandArmory();
    expect(armory.selectWeapon('burstRifle')).toBe(false);
    expect(armory.getState()).toEqual({ owned: ['pistol'], slots: [null, null], selectedWeapon: null });
    armory.selectWeapon('pistol');
    expect(armory.selectWeapon('burstRifle')).toBe(false);
    expect(armory.getState().selectedWeapon).toBe('pistol');
  });
  it('isolates loadout snapshots and new sessions', () => {
    const armory = new LastStandArmory();
    const snapshot = armory.getState();
    snapshot.owned.push('burstRifle');
    snapshot.slots[0] = 'burstRifle';
    snapshot.selectedWeapon = 'burstRifle';
    expect(armory.getState()).toEqual({ owned: ['pistol'], slots: [null, null], selectedWeapon: null });
    armory.selectWeapon('pistol');
    armory.clickSlot(1);
    expect(new LastStandArmory().getState()).toEqual({ owned: ['pistol'], slots: [null, null], selectedWeapon: null });
  });
});
