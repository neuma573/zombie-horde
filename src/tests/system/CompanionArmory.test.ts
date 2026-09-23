import { describe, expect, it } from 'vitest';
import { LastStandArmory } from '../../systems/LastStandArmory';

describe('companion armory', () => {
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
