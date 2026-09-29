import { describe, expect, it } from 'vitest';
import { ExplorationSystem } from '../../systems/ExplorationSystem';
import { CompanionSystem } from '../../systems/CompanionSystem';

function createSchedule() {
  const sites = [['recruit', 0], ['player-job', 9], ['ally-job', 10], ['joint', 3], ['short', 1]] as const;
  let roll = 0;
  const companions = new CompanionSystem(() => roll);
  companions.resolveSearch(1, 'recruit', [], 1);
  roll = 0.99;
  const system = new ExplorationSystem(sites.map(([id, searchHours]) => ({
    id, name: id, x: 0, y: 0, searchHours, lootTable: {}, searched: false,
  })), () => 0.99, companions);
  // Recruit generation uses zero; all later searches safely return with no new recruits.
  system.completeNight(1, 0);
  return { system, ally: system.companions.getActive()[0].id };
}

describe('exploration schedule availability', () => {
  it('accepts a two-hour automatic search within the shared daily budget', () => {
    const { system } = createSchedule();
    system.toggleLocation('player-job');
    expect(system.getUnallocatedHours()).toBe(7);
    expect(system.getSearchHours('joint')).toBe(2);
    expect(system.getLocationPlanBlock('joint')).toBeNull();
    expect(system.canPlanLocation('joint')).toBe(true);
    expect(system.toggleLocation('joint')).toBe(true);
  });

  it('rejects over-budget additions without changing the automatic party or shared plan', () => {
    const { system, ally } = createSchedule();
    system.toggleLocation('player-job');
    system.setTeamRepairHours(4);
    const before = system.getState();
    expect(system.getUnallocatedHours()).toBe(3);
    expect(system.getParticipants('ally-job')).toEqual(['player', ally]);
    expect(system.getLocationPlanBlock('ally-job')).toEqual({
      reason: 'NOT ENOUGH TIME', requiredHours: 14.5, availableHours: 12,
    });
    expect(system.toggleLocation('ally-job')).toBe(false);
    expect(system.getState()).toEqual(before);
  });

  it('gives the whole automatic party the same search and repair budget', () => {
    const { system, ally } = createSchedule();
    system.toggleLocation('player-job');
    system.toggleLocation('joint');
    expect(system.getUnallocatedHours(ally)).toBe(5);
    expect(system.getUnallocatedHours()).toBe(5);
    expect(system.setTeamRepairHours(6)).toBe(false);
    expect(system.setTeamRepairHours(5)).toBe(true);
    expect(system.getUnallocatedHours()).toBe(0);
    expect(system.getRepairHours(ally)).toBe(5);
    expect(system.getLocationPlanBlock('short')).toEqual({
      reason: 'NOT ENOUGH TIME', requiredHours: 13, availableHours: 12,
    });
  });

  it('releases only shared search time when a building is removed from the plan', () => {
    const { system, ally } = createSchedule();
    system.toggleLocation('player-job');
    system.toggleLocation('joint');
    expect(system.setTeamRepairHours(5)).toBe(true);
    expect(system.getUnallocatedHours()).toBe(0);
    expect(system.toggleLocation('joint')).toBe(true);
    expect(system.getUnallocatedHours()).toBe(2);
    expect(system.getUnallocatedHours(ally)).toBe(2);
    expect(system.getParticipants('joint')).toEqual(['player', ally]);
    expect(system.toggleLocation('joint')).toBe(true);
    expect(system.getUnallocatedHours()).toBe(0);
    expect(system.getParticipants('joint')).toEqual(['player', ally]);
  });

  it('counts direct automatic searches toward both shared time and companion rest', () => {
    const { system, ally } = createSchedule();
    expect(system.search('player-job')).toMatchObject({ hoursSpent: 5, remainingHours: 7 });
    expect(system.getParticipants('player-job')).toEqual(['player', ally]);
    expect(system.toggleLocation('joint')).toBe(true);
    expect(system.setTeamRepairHours(6)).toBe(false);
    expect(system.getUnallocatedHours()).toBe(5);
    expect(system.getUnallocatedHours(ally)).toBe(5);
    expect(system.setTeamRepairHours(5)).toBe(true);
    expect(system.confirmPlan()).toMatchObject({ hoursSpent: 7, repaired: 50 });
    expect(system.getState().remainingHours).toBe(0);
    expect(system.getUnallocatedHours(ally)).toBe(0);
    expect(system.companions.getActive()[0].courage).toBe(38);
  });

  it('settles casualties in selected order and automatically carries survivors to the next site', () => {
    let outcomes: number[] | undefined;
    const companions = new CompanionSystem(() => outcomes ? outcomes.shift() ?? 0.99 : 0);
    companions.resolveSearch(1, 'recruit-a', [], 1);
    companions.resolveSearch(1, 'recruit-b', [], 1);
    const system = new ExplorationSystem([['later', 8], ['first', 2]].map(([id, searchHours]) => ({
      id: String(id), name: String(id), x: 0, y: 0, searchHours: Number(searchHours), lootTable: {}, searched: false,
    })), () => 0.99, companions);
    system.completeNight(1, 50);
    const [a, b] = companions.getActive();
    system.toggleLocation('first');
    system.toggleLocation('later');
    expect(system.getUnallocatedHours()).toBe(8);
    expect(system.setTeamRepairHours(3)).toBe(true);
    expect(system.getProjectedRepair()).toBe(45);
    outcomes = [0, 0.99, 0.99, 0.99];

    expect(system.confirmPlan()).toMatchObject({ locationIds: ['first', 'later'], hoursSpent: 9, repaired: 30 });
    expect(system.getSearchHours('first')).toBe(1);
    expect(system.getSearchHours('later')).toBe(5);
    expect(system.getUnallocatedHours()).toBe(3);
    expect(system.getRepairHours(a.id)).toBe(0);
    expect(system.getRepairHours(b.id)).toBe(3);
    expect(companions.getActive()).toMatchObject([{ id: b.id, courage: 26 }]);
  });

  it('keeps first-night and searched-location failures distinct from time shortages', () => {
    const fresh = new ExplorationSystem();
    expect(fresh.getLocationPlanBlock('gas')).toEqual({ reason: 'SURVIVE THE FIRST NIGHT' });
    const { system } = createSchedule();
    system.search('recruit');
    expect(system.getLocationPlanBlock('recruit')).toEqual({ reason: 'SEARCHED' });
    expect(system.getLocationPlanBlock('missing')).toEqual({ reason: 'UNKNOWN LOCATION' });
  });
});
