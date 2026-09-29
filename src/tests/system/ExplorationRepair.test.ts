import { describe, expect, it } from 'vitest';
import { ExplorationSystem } from '../../systems/ExplorationSystem';
import { CompanionSystem } from '../../systems/CompanionSystem';

function dangerousDay() {
  const companions = new CompanionSystem(() => 0);
  companions.resolveSearch(1, 'recruit', [], 1);
  const system = new ExplorationSystem(undefined, () => 0, companions);
  system.completeNight(1, 50);
  return system;
}

function crewDay(count = 2, barricade = 50) {
  let roll = 0;
  const companions = new CompanionSystem(() => roll);
  for (let index = 0; index < count; index++) companions.resolveSearch(1, 'recruit', [], 1);
  roll = 0.99;
  const system = new ExplorationSystem(undefined, () => 0.99, companions);
  system.completeNight(1, barricade);
  return system;
}

describe('actual barricade repair', () => {
  it('ends the selected route at the first over-budget site even when a later site still fits', () => {
    const system = dangerousDay();
    for (const id of ['gas', 'fuel-depot', 'police', 'house-b']) {
      expect(system.toggleLocation(id)).toBe(true);
    }

    expect(system.confirmPlan()).toMatchObject({ locationIds: ['gas', 'fuel-depot'], hoursSpent: 8 });
    for (const id of ['police', 'house-b']) {
      expect(system.getState().locations.find(location => location.id === id)?.searched).toBe(false);
    }
    expect(system.getRecoveredWeapons()).not.toContain('doubleBarrelShotgun');
    expect(system.getRecoveredWeapons()).not.toContain('burstRifle');
    expect(system.getUnallocatedHours()).toBe(4);
  });

  it('reduces repair to the time left when a dead searcher slows later exploration', () => {
    const system = dangerousDay();
    system.toggleLocation('gas');
    system.toggleLocation('fuel-depot');
    expect(system.getSearchHours('fuel-depot')).toBe(3.5);
    expect(system.setTeamRepairHours(6)).toBe(true);

    const result = system.confirmPlan();

    expect(result).toMatchObject({ locationIds: ['gas', 'fuel-depot'], repaired: 20, hoursSpent: 12 });
    expect(system.getSearchHours('fuel-depot')).toBe(6);
    expect(system.getRepairHours()).toBe(4);
    expect(system.getState().barricade).toBe(70);
    expect(system.getUnallocatedHours()).toBe(0);
  });

  it('leaves a later site unsearched if casualties make it exceed the remaining day', () => {
    const system = dangerousDay();
    system.toggleLocation('gas');
    system.toggleLocation('fuel-depot');
    system.toggleLocation('police');
    expect(system.setTeamRepairHours(3)).toBe(true);

    const result = system.confirmPlan();

    expect(result).toMatchObject({ locationIds: ['gas', 'fuel-depot'], repaired: 15, hoursSpent: 11 });
    expect(system.getState().locations.find(location => location.id === 'police')?.searched).toBe(false);
    expect(system.getRecoveredWeapons()).not.toContain('burstRifle');
    expect(system.getUnallocatedHours()).toBe(1);
  });
});

describe('shared barricade repair', () => {
  it('allocates one setting to the player and eligible companions and sums their actual work once', () => {
    const system = crewDay();
    expect(system.setTeamRepairHours(2)).toBe(true);
    expect(system.getTeamRepairSummary()).toEqual({ workers: 3, totalHours: 6 });
    expect(system.getState().repairHours).toBe(2);
    for (const ally of system.getAvailableCompanions()) expect(system.getRepairHours(ally.id)).toBe(2);
    expect(system.getProjectedRepair()).toBe(30);

    expect(system.confirmPlan()).toMatchObject({ hoursSpent: 2, repaired: 30 });
    expect(system.getState().barricade).toBe(80);
    expect(system.getProjectedRepair()).toBe(30);
    expect(system.getTeamRepairSummary()).toEqual({ workers: 3, totalHours: 6 });
    expect(system.confirmPlan()).toBeNull();
    expect(system.setTeamRepairHours(3)).toBe(false);
  });

  it('shares remaining repair time with the automatic party and rejects overbooking', () => {
    const system = crewDay(1);
    const ally = system.getAvailableCompanions()[0].id;
    system.toggleLocation('gas');
    system.toggleLocation('fuel-depot');
    system.toggleLocation('police');
    expect(system.setTeamRepairHours(6)).toBe(false);
    expect(system.setTeamRepairHours(3)).toBe(true);
    expect(system.getRepairHours()).toBe(3);
    expect(system.getRepairHours(ally)).toBe(3);
    expect(system.getProjectedRepair()).toBe(30);

    expect(system.toggleLocation('pharmacy')).toBe(false);
    expect(system.setTeamRepairHours(1)).toBe(true);
    expect(system.toggleLocation('pharmacy')).toBe(true);
    expect(system.getRepairHours()).toBe(1);
    expect(system.getRepairHours(ally)).toBe(1);
    expect(system.getProjectedRepair()).toBe(10);
    expect(system.toggleLocation('pharmacy')).toBe(true);
    expect(system.setTeamRepairHours(3)).toBe(true);
    expect(system.getRepairHours()).toBe(3);
  });

  it('stops assigning extra workers once the remaining damage is covered', () => {
    const system = crewDay(2, 90);
    system.setTeamRepairHours(4);

    expect(system.getTeamRepairSummary()).toEqual({ workers: 2, totalHours: 2 });
    expect(system.getProjectedRepair()).toBe(10);
    expect(system.confirmPlan()).toMatchObject({ repaired: 10, hoursSpent: 1 });
    expect(system.getState().barricade).toBe(100);
    expect(system.getUnallocatedHours()).toBe(11);
  });

  it('uses one shared hour to finish a nearly repaired barricade without over-repairing', () => {
    const system = crewDay(2, 99);
    expect(system.setTeamRepairHours(4)).toBe(true);
    expect(system.getTeamRepairHours()).toBe(1);
    expect(system.getTeamRepairSummary()).toEqual({ workers: 1, totalHours: 1 });
    expect(system.getUnallocatedHours()).toBe(11);

    expect(system.confirmPlan()).toMatchObject({ repaired: 1, hoursSpent: 1 });
    expect(system.getState().barricade).toBe(100);
    expect(system.getUnallocatedHours()).toBe(11);
  });

  it('keeps current-day recruits out of automatic repair', () => {
    const system = dangerousDay();
    system.companions.resolveSearch(2, 'new-recruit', [], 1);
    const newcomer = system.companions.getActive().find(ally => ally.joinedDay === 2)!;
    system.setTeamRepairHours(1);

    expect(system.getTeamRepairSummary()).toEqual({ workers: 2, totalHours: 2 });
    expect(system.getRepairHours(newcomer.id)).toBe(0);
    expect(system.confirmPlan()?.repaired).toBe(10);
  });

  it('prevents repairs when the automatic party uses the entire shared day', () => {
    const system = crewDay(2);
    for (const site of ['gas', 'grocery', 'police', 'fuel-depot', 'warehouse', 'workshop', 'pharmacy']) {
      system.toggleLocation(site);
    }
    expect(system.setTeamRepairHours(2)).toBe(false);

    expect(system.getRepairHours()).toBe(0);
    expect(system.getTeamRepairSummary()).toEqual({ workers: 0, totalHours: 0 });
    expect(system.confirmPlan()).toMatchObject({ repaired: 0, hoursSpent: 12 });
    expect(system.getUnallocatedHours()).toBe(0);
  });

  it('caps automatic repair by actual survival and actual remaining time after casualties', () => {
    const system = dangerousDay();
    const ally = system.getAvailableCompanions()[0].id;
    system.toggleLocation('gas');
    system.toggleLocation('fuel-depot');
    system.setTeamRepairHours(6);
    expect(system.getProjectedRepair()).toBe(50);

    expect(system.confirmPlan()).toMatchObject({ repaired: 20, hoursSpent: 12 });
    expect(system.getRepairHours()).toBe(4);
    expect(system.getRepairHours(ally)).toBe(0);
    expect(system.getState().barricade).toBe(70);
  });

  it('releases every repair allocation with one setting and clears it for the next day', () => {
    const system = crewDay();
    system.setTeamRepairHours(2);
    expect(system.setTeamRepairHours(0)).toBe(true);
    expect(system.getTeamRepairSummary()).toEqual({ workers: 0, totalHours: 0 });
    system.setTeamRepairHours(2);
    system.confirmPlan();
    system.completeNight(2, 60);
    expect(system.getTeamRepairHours()).toBe(0);
    expect(system.getTeamRepairSummary()).toEqual({ workers: 0, totalHours: 0 });
  });

  it('rejects invalid shared repair requests without changing existing allocations', () => {
    const system = crewDay();
    system.setTeamRepairHours(2);
    const before = system.getState();
    for (const hours of [-1, 0.5, NaN, Infinity, 13]) expect(system.setTeamRepairHours(hours)).toBe(false);
    expect(system.getState()).toEqual(before);
    expect(system.getTeamRepairHours()).toBe(2);
    expect(new ExplorationSystem().setTeamRepairHours(1)).toBe(false);
  });
});
