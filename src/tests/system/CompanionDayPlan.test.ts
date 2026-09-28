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
  it('shortens searches without multiplying loot within one shared budget', () => {
    const solo = new ExplorationSystem(undefined, () => 0);
    solo.completeNight(1, 50);
    const team = recruitedDay();
    const id = team.companions.getActive()[0].id;
    solo.toggleLocation('grocery');
    expect(solo.getParticipants('grocery')).toEqual(['player']);
    team.toggleLocation('grocery');
    expect(team.getParticipants('grocery')).toEqual(['player', id]);
    expect(team.getSearchHours('grocery')).toBeLessThan(solo.getSearchHours('grocery'));
    expect(team.getUnallocatedHours(id)).toBe(team.getUnallocatedHours());
    expect(team.confirmPlan()?.loot).toEqual(solo.confirmPlan()?.loot);
  });
  it('requires the player to search and reserves repair after the shared exploration', () => {
    const system = recruitedDay();
    const id = system.companions.getActive()[0].id;
    system.toggleLocation('grocery');
    expect(system.getParticipants('grocery')).toEqual(['player', id]);
    expect(system.setTeamRepairHours(10)).toBe(false);
    expect(system.setTeamRepairHours(4)).toBe(true);
    expect(system.getUnallocatedHours()).toBe(5.5);
    expect(system.confirmPlan()).toMatchObject({ repaired: 20, hoursSpent: 6.5 });
  });
  it('keeps automatic parties unchanged by invalid plans or mutations of returned arrays', () => {
    const system = recruitedDay();
    const id = system.companions.getActive()[0].id;
    system.toggleLocation('fuel-depot');
    system.toggleLocation('grocery');
    expect(system.setTeamRepairHours(5)).toBe(true);
    const before = system.getState();
    const party = system.getParticipants('fuel-depot');
    party.push(id, 'unknown');
    expect(system.toggleLocation('missing')).toBe(false);
    expect(system.toggleLocation('warehouse')).toBe(false);
    expect(system.getState()).toEqual(before);
    expect(system.getParticipants('fuel-depot')).toEqual(['player', id]);
  });
  it('keeps same-day recruits out of work and preserves recruitment after night retry', () => {
    const system = new ExplorationSystem(undefined, () => 0);
    system.completeNight(1, 50);
    system.search('gas');
    system.search('house-a');
    const id = system.companions.getActive()[0].id;
    system.toggleLocation('grocery');
    expect(system.getParticipants('grocery')).toEqual(['player']);
    expect(system.setTeamRepairHours(1)).toBe(true);
    expect(system.getRepairHours(id)).toBe(0);
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
  it('keeps supplies and continues with the player after a companion dies', () => {
    const system = recruitedDay();
    const id = system.companions.getActive()[0].id;
    system.toggleLocation('grocery');
    system.toggleLocation('pharmacy');
    const hours = system.getSearchHours('grocery');
    const result = system.confirmPlan()!;
    expect(result.loot).toEqual({ food: 3, ammo: 1, fuel: 0 });
    expect(result.locationIds).toEqual(['grocery', 'pharmacy']);
    expect(system.getState().locations.find(site => site.id === 'pharmacy')?.searched).toBe(true);
    expect(system.companions.getRoster().find(ally => ally.id === id)?.status).toBe('dead');
    expect(system.getSearchHours('grocery')).toBe(hours);
    expect(system.getSearchHours('pharmacy')).toBe(2);
    expect(system.getParticipants('grocery')).toEqual(['player', id]);
    expect(system.getParticipants('pharmacy')).toEqual(['player']);
    expect(result.hoursSpent).toBe(hours + 2);
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

  it('recovers the weapon cache with the player and excludes dead companions from repair', () => {
    const system = recruitedDay();
    const id = system.companions.getActive()[0].id;
    system.toggleLocation('police');
    expect(system.getParticipants('police')).toEqual(['player', id]);
    expect(system.setTeamRepairHours(1)).toBe(true);
    const result = system.confirmPlan()!;
    expect(system.getRecoveredWeapons()).toEqual(['burstRifle']);
    expect(result.repaired).toBe(5);
    expect(system.getRepairHours(id)).toBe(0);
  });

  it('uses the same automatic party for every sequential search', () => {
    const system = recruitedDay();
    const id = system.companions.getActive()[0].id;
    for (const site of ['grocery', 'pharmacy', 'police']) {
      expect(system.toggleLocation(site)).toBe(true);
      expect(system.getParticipants(site)).toEqual(['player', id]);
    }
    expect(system.getUnallocatedHours()).toBe(5);
    expect(system.getUnallocatedHours(id)).toBe(5);
  });

  it('automatically includes all eligible companions when marking each building', () => {
    const system = recruitedDay();
    for (let index = 0; index < 3; index++) system.companions.resolveSearch(2, 'recruit', [], 1);
    const ids = system.companions.getActive().map(ally => ally.id);
    expect(ids).toHaveLength(4);

    expect(system.getParticipants('grocery')).toEqual(['player', ...ids]);
    expect(system.toggleLocation('grocery')).toBe(true);
    expect(system.toggleLocation('pharmacy')).toBe(true);
    expect(system.getParticipants('grocery')).toEqual(['player', ...ids]);
    expect(system.getParticipants('pharmacy')).toEqual(['player', ...ids]);
  });

  it('updates every pending building automatically after a companion is lost', () => {
    const system = recruitedDay();
    const id = system.companions.getActive()[0].id;
    system.toggleLocation('grocery');
    const together = system.getSearchHours('grocery');
    system.companions.resolveSearch(3, 'loss', [id], 1);

    expect(system.getSearchHours('grocery')).toBeGreaterThan(together);
    expect(system.getParticipants('pharmacy')).toEqual(['player']);
    expect(system.getParticipants('grocery')).toEqual(['player']);
    expect(system.getSearchHours('grocery')).toBe(4);
    expect(system.getSearchHours('pharmacy')).toBe(2);
  });

  it('offers searches that fit with the automatic party but exceed the solo time budget', () => {
    const system = recruitedDay();
    expect(system.toggleLocation('fuel-depot')).toBe(true);
    expect(system.setTeamRepairHours(5)).toBe(true);
    expect(system.getUnallocatedHours()).toBe(3.5);

    expect(system.canPlanLocation('grocery')).toBe(true);
    expect(system.hasPlannableLocations()).toBe(true);
    expect(system.toggleLocation('grocery')).toBe(true);
    expect(system.getSearchHours('grocery')).toBe(2.5);
    expect(system.getUnallocatedHours()).toBe(1);
  });

  it('previews the automatic party without reserving time and rejects over-budget plans', () => {
    const system = recruitedDay();
    const id = system.companions.getActive()[0].id;
    expect(system.toggleLocation('fuel-depot')).toBe(true);
    expect(system.toggleLocation('police')).toBe(true);
    expect(system.setTeamRepairHours(4)).toBe(true);
    const before = system.getState();

    expect(system.canPlanLocation('grocery')).toBe(false);
    expect(system.toggleLocation('grocery')).toBe(false);
    expect(system.getState()).toEqual(before);
    expect(system.getParticipants('grocery')).toEqual(['player', id]);
    expect(system.getState()).toEqual(before);
    expect(system.getUnallocatedHours()).toBe(1.5);
    expect(system.setTeamRepairHours(3)).toBe(true);
    expect(system.canPlanLocation('grocery')).toBe(true);
    expect(system.toggleLocation('grocery')).toBe(true);
    expect(system.getParticipants('grocery')).toEqual(['player', id]);
  });

  it('does not default same-day recruits into exploration and freezes confirmed teams', () => {
    const system = new ExplorationSystem(undefined, () => 0);
    system.completeNight(1, 50);
    system.search('gas');
    expect(system.companions.getActive()).toHaveLength(1);
    expect(system.getAvailableCompanions()).toEqual([]);
    expect(system.toggleLocation('grocery')).toBe(true);
    expect(system.getParticipants('grocery')).toEqual(['player']);
    system.confirmPlan();

    expect(system.getParticipants('grocery')).toEqual(['player']);
    expect(system.toggleLocation('grocery')).toBe(false);
    expect(system.toggleLocation('police')).toBe(false);
  });

  it('keeps the automatic party when a building is unmarked and marked again', () => {
    const system = recruitedDay();
    const id = system.companions.getActive()[0].id;
    system.toggleLocation('grocery');
    expect(system.toggleLocation('grocery')).toBe(true);
    expect(system.toggleLocation('grocery')).toBe(true);
    expect(system.getParticipants('grocery')).toEqual(['player', id]);
    expect(system.toggleLocation('missing')).toBe(false);
  });

});
