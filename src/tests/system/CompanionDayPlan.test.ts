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
  it('loses supplies with a wiped-out team and leaves its later sites unsearched', () => {
    const system = recruitedDay();
    const id = system.companions.getActive()[0].id;
    system.toggleLocation('grocery');
    system.setParticipants('grocery', [id]);
    system.toggleLocation('pharmacy');
    system.setParticipants('pharmacy', [id]);
    const hours = system.getSearchHours('grocery');
    const result = system.confirmPlan()!;
    expect(result.loot).toEqual({ food: 0, ammo: 0, fuel: 0 });
    expect(result.locationIds).toEqual(['grocery']);
    expect(system.getState().locations.find(site => site.id === 'pharmacy')?.searched).toBe(false);
    expect(system.companions.getActive()).toHaveLength(0);
    expect(system.getSearchHours('grocery')).toBe(hours);
  });

  it('does not apply survival recovery twice when a night result is repeated', () => {
    const system = recruitedDay();
    const initial = system.companions.getActive()[0].courage;
    expect(system.completeNight(3, 40)).toBe(true);
    const recovered = system.companions.getActive()[0].courage;
    expect(recovered).toBeGreaterThan(initial);
    expect(system.completeNight(3, 40)).toBe(false);
    expect(system.companions.getActive()[0].courage).toBe(recovered);
  });

  it('does not recover a weapon cache or perform repairs when its only searcher dies', () => {
    const system = recruitedDay();
    const id = system.companions.getActive()[0].id;
    system.toggleLocation('police');
    expect(system.setParticipants('police', [id])).toBe(true);
    expect(system.setRepairHours(1, id)).toBe(true);
    const result = system.confirmPlan()!;
    expect(system.getRecoveredWeapons()).toEqual([]);
    expect(result.repaired).toBe(0);
  });

  it('rejects a joint schedule that finishes after twelve hours despite spare personal hours', () => {
    const locations = [['recruit', 0], ['long', 8], ['joint', 1], ['last', 3]] as const;
    const system = new ExplorationSystem(locations.map(([id, searchHours]) => ({
      id, name: id, x: 0, y: 0, searchHours, lootTable: {}, searched: false,
    })), () => 0);
    system.completeNight(1, 50);
    system.search('recruit');
    system.completeNight(2, 50);
    const id = system.companions.getActive()[0].id;
    expect(system.toggleLocation('long')).toBe(true);
    expect(system.toggleLocation('joint')).toBe(true);
    expect(system.setParticipants('joint', ['player', id])).toBe(true);
    expect(system.toggleLocation('last')).toBe(true);
    expect(system.getUnallocatedHours(id)).toBe(11);
    expect(system.setParticipants('last', [id])).toBe(false);
    expect(system.getParticipants('last')).toEqual(['player']);
  });

});
