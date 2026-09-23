import { describe, expect, it } from 'vitest';
import { ExplorationSystem } from '../../systems/ExplorationSystem';
import { LastStandArmory } from '../../systems/LastStandArmory';
import { CompanionCombat } from '../../systems/CompanionCombat';

describe('companion night lifecycle', () => {
  it('preserves daytime recruitment on retry and returns a fleeing survivor at minimum courage', () => {
    const day = new ExplorationSystem(undefined, () => 0);
    day.completeNight(1, 50);
    day.toggleLocation('police');
    day.confirmPlan();
    const companion = day.companions.getActive()[0];
    const armory = new LastStandArmory();
    armory.syncCompanions([companion.id]);
    armory.selectWeapon('pistol'); armory.clickSlot(0);
    const initial = day.getState();
    expect(armory.toggleDeployment(companion.id, initial.resources.ammo)).toBe(true);
    expect(day.beginNight(armory.getDeployedIds().length)).toBe(true);
    const failed = new CompanionCombat([{ companion, weaponId: null }], [{ x: 100, y: 100 }], { x: 400, y: 100 });
    failed.advance(100, 0, [], []);
    day.retryNight();
    expect(day.getState()).toEqual(initial);
    expect(day.companions.getActive()).toEqual([companion]);

    expect(day.beginNight(1)).toBe(true);
    const replay = new CompanionCombat([{ companion, weaponId: null }], [{ x: 100, y: 100 }], { x: 400, y: 100 });
    expect(replay.getFledIds()).toEqual([]);
    replay.advance(100, 0, [], []);
    expect(day.completeNight(initial.day, 0, replay.getFledIds())).toBe(true);
    expect(day.getState().resources.ammo).toBe(initial.resources.ammo - 1);
    expect(day.companions.getActive()[0]).toMatchObject({ id: companion.id, status: 'active', courage: 0 });
    expect(day.getState().day).toBe(3);
  });
});
