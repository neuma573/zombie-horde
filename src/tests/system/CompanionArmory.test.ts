import { describe, expect, it } from 'vitest';
import { LastStandArmory } from '../../systems/LastStandArmory';

describe('companion armory', () => {
  it('clears participation without losing weapons and requires fresh deployment after roster sync', () => {
    const armory = new LastStandArmory();
    armory.syncCompanions(['a', 'b']);
    armory.selectWeapon('pistol');
    armory.clickSlot(0);
    armory.addWeapon('burstRifle');
    armory.assignCompanion('a', 'burstRifle');
    armory.toggleDeployment('a', 2);
    armory.toggleDeployment('b', 2);
    const loadout = armory.getState();

    armory.clearDeployments();
    armory.syncCompanions(['a', 'b']);

    expect(armory.getDeployedIds()).toEqual([]);
    expect(armory.getState()).toEqual(loadout);
    expect(armory.getCompanionWeapon('a')).toBe('burstRifle');
    expect(armory.toggleDeployment('a', 1)).toBe(true);
    expect(armory.getDeployedIds()).toEqual(['a']);
  });

  it('equips a rack selection in a companion slot and returns the weapon to the rack on release', () => {
    const armory = new LastStandArmory();
    armory.syncCompanions(['a']);
    armory.addWeapon('doubleBarrelShotgun');
    armory.selectWeapon('doubleBarrelShotgun');

    expect(armory.clickCompanionSlot('a')).toBe(true);
    expect(armory.getCompanionWeapon('a')).toBe('doubleBarrelShotgun');
    expect(armory.getState().selectedWeapon).toBeNull();
    expect(armory.selectWeapon('doubleBarrelShotgun')).toBe(false);
    expect(armory.clickCompanionSlot('a')).toBe(true);
    expect(armory.getCompanionWeapon('a')).toBeNull();
    expect(armory.selectWeapon('doubleBarrelShotgun')).toBe(true);
  });

  it('replaces a companion weapon with a rack selection without changing deployment', () => {
    const armory = new LastStandArmory();
    armory.syncCompanions(['a']);
    armory.addWeapon('burstRifle');
    armory.assignCompanion('a', 'pistol');
    armory.toggleDeployment('a', 1);
    armory.selectWeapon('burstRifle');

    expect(armory.clickCompanionSlot('a')).toBe(true);
    expect(armory.getCompanionWeapon('a')).toBe('burstRifle');
    expect(armory.isAssigned('pistol')).toBe(false);
    expect(armory.getDeployedIds()).toEqual(['a']);
  });

  it('rejects an unknown companion slot without losing the rack selection', () => {
    const armory = new LastStandArmory();
    armory.selectWeapon('pistol');

    expect(armory.clickCompanionSlot('unknown')).toBe(false);
    expect(armory.getState().selectedWeapon).toBe('pistol');
    expect(armory.clickSlot(0)).toBe(true);
  });

  it('assigns each owned gun to at most one player or companion slot', () => {
    const armory = new LastStandArmory();
    armory.syncCompanions(['a', 'b']);
    armory.addWeapon('doubleBarrelShotgun');
    expect(armory.assignCompanion('a', 'doubleBarrelShotgun')).toBe(true);
    expect(armory.assignCompanion('b', 'doubleBarrelShotgun')).toBe(false);
    expect(armory.selectWeapon('doubleBarrelShotgun')).toBe(false);
    expect(armory.assignCompanion('a', null)).toBe(true);
    expect(armory.selectWeapon('doubleBarrelShotgun')).toBe(true);
    expect(armory.clickSlot(1)).toBe(true);
    expect(armory.assignCompanion('a', 'doubleBarrelShotgun')).toBe(false);
    expect(armory.assignCompanion('unknown', 'pistol')).toBe(false);
  });
  it('limits deployment by ammo and releases assignments of dead companions', () => {
    const armory = new LastStandArmory();
    armory.syncCompanions(['a', 'b']);
    expect(armory.toggleDeployment('a', 0)).toBe(false);
    expect(armory.toggleDeployment('a', 1)).toBe(true);
    expect(armory.toggleDeployment('b', 1)).toBe(false);
    armory.assignCompanion('a', 'pistol');
    armory.syncCompanions(['b']);
    expect(armory.getDeployedIds()).toEqual([]);
    expect(armory.selectWeapon('pistol')).toBe(true);
  });
});
