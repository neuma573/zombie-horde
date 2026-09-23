import { describe, expect, it } from 'vitest';
import { ExplorationSystem } from '../../systems/ExplorationSystem';

function recruitedDay() {
  const system = new ExplorationSystem(undefined, () => 0);
  system.completeNight(1, 50);
  system.search('gas');
  system.completeNight(2, 50);
  return system;
}

describe('companion day allocation', () => {
  it('shortens searches without multiplying loot and keeps individual budgets', () => {
    const solo = recruitedDay();
    const team = recruitedDay();
    const id = team.companions.getActive()[0].id;
    solo.toggleLocation('grocery');
    team.toggleLocation('grocery');
    expect(team.setParticipants('grocery', ['player', id])).toBe(true);
    expect(team.getSearchHours('grocery')).toBeLessThan(solo.getSearchHours('grocery'));
    expect(team.getUnallocatedHours(id)).toBe(team.getUnallocatedHours());
    expect(team.confirmPlan()?.loot).toEqual(solo.confirmPlan()?.loot);
  });
  it('allows companion searches and player repairs in parallel', () => {
    const system = recruitedDay();
    const id = system.companions.getActive()[0].id;
    system.toggleLocation('grocery');
    expect(system.setParticipants('grocery', [id])).toBe(true);
    expect(system.setRepairHours(10)).toBe(true);
    expect(system.getUnallocatedHours()).toBe(2);
    expect(system.confirmPlan()?.repaired).toBe(50);
  });
  it('rejects unknown, duplicate, empty and over-budget assignments atomically', () => {
    const system = recruitedDay();
    const id = system.companions.getActive()[0].id;
    system.toggleLocation('fuel-depot');
    system.setParticipants('fuel-depot', ['player', id]);
    system.setRepairHours(7, id);
    const previous = system.getParticipants('fuel-depot');
    expect(system.setParticipants('fuel-depot', [])).toBe(false);
    expect(system.setParticipants('fuel-depot', ['unknown'])).toBe(false);
    expect(system.setParticipants('fuel-depot', [id, id])).toBe(false);
    expect(system.setParticipants('fuel-depot', [id])).toBe(false);
    expect(system.getParticipants('fuel-depot')).toEqual(previous);
  });
  it('keeps same-day recruits out of work and preserves recruitment after night retry', () => {
    const system = new ExplorationSystem(undefined, () => 0);
    system.completeNight(1, 50);
    system.search('gas');
    system.search('house-a');
    const id = system.companions.getActive()[0].id;
    system.toggleLocation('grocery');
    expect(system.setParticipants('grocery', ['player', id])).toBe(false);
    expect(system.setRepairHours(1, id)).toBe(false);
    const before = system.getState();
    const roster = system.companions.getRoster();
    expect(system.beginNight(1)).toBe(true);
    expect(system.getState().resources.ammo).toBe(before.resources.ammo - 1);
    expect(system.beginNight(1)).toBe(false);
    system.retryNight();
    expect(system.getState()).toEqual(before);
    expect(system.companions.getRoster()).toEqual(roster);
  });
  it('rejects unaffordable deployment without consuming ammo', () => {
    const system = new ExplorationSystem(undefined, () => 0);
    expect(system.beginNight(1)).toBe(false);
    expect(system.getState().resources.ammo).toBe(0);
    expect(system.beginNight(0)).toBe(true);
  });
});
