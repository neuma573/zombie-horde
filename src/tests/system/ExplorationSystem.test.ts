import { describe, expect, it } from 'vitest';
import { ExplorationSystem } from '../../systems/ExplorationSystem';

function createDayTwoExploration(...args: ConstructorParameters<typeof ExplorationSystem>) {
  const system = new ExplorationSystem(...args);
  system.completeNight(1, system.getState().barricade);
  return system;
}

describe('ExplorationSystem', () => {
  it('starts the first exploration day with twelve hours and no resources', () => {
    const system = createDayTwoExploration(undefined, () => 0);
    expect(system.getState().remainingHours).toBe(12);
    expect(system.getState().resources).toEqual({ food: 0, ammo: 0, fuel: 0 });
    expect(system.getState().locations.every(location => !location.searched)).toBe(true);
  });
  it('keeps eligibility checks free of time and resource changes', () => {
    const system = createDayTwoExploration(undefined, () => 0);
    const before = system.getState();
    expect(system.canSearch('gas')).toBe(true);
    expect(system.getState()).toEqual(before);
  });
  it('spends three hours and accumulates gas station loot on confirmation', () => {
    const system = createDayTwoExploration(undefined, () => 0);
    expect(system.search('gas')).toEqual({ ok: true, locationId: 'gas', hoursSpent: 3,
      remainingHours: 9, loot: { food: 1, ammo: 0, fuel: 1 } });
    expect(system.getState().resources).toEqual({ food: 1, ammo: 0, fuel: 1 });
    expect(system.getState().locations.find(location => location.id === 'gas')?.searched).toBe(true);
    system.search('grocery');
    expect(system.getState().resources).toEqual({ food: 3, ammo: 1, fuel: 1 });
  });
  it('rejects repeat confirmation without changing state', () => {
    const system = createDayTwoExploration(undefined, () => 0);
    system.search('gas');
    const before = system.getState();
    expect(system.search('gas')).toEqual({ ok: false, reason: 'SEARCHED' });
    expect(system.getState()).toEqual(before);
  });
  it('rejects an unaffordable location without changing state', () => {
    const system = createDayTwoExploration(undefined, () => 0);
    system.search('police');
    system.search('grocery');
    const before = system.getState();
    expect(system.search('gas').ok).toBe(true);
    expect(system.search('house-a')).toEqual({ ok: false, reason: 'NOT ENOUGH TIME' });
    expect(system.getState().remainingHours).toBe(0);
    expect(before.remainingHours).toBe(3);
    const depleted = system.getState();
    expect(system.search('pharmacy')).toEqual({ ok: false, reason: 'NOT ENOUGH TIME' });
    expect(system.getState()).toEqual(depleted);
    expect(system.hasSearchableLocations()).toBe(false);
  });
  it('finishes exploration when remaining time cannot pay for any location', () => {
    const system = createDayTwoExploration(undefined, () => 0);
    system.search('police');
    system.search('grocery');
    system.search('pharmacy');
    expect(system.getState().remainingHours).toBe(1);
    expect(system.hasSearchableLocations()).toBe(false);
  });
  it('rejects unknown IDs without changing state', () => {
    const system = createDayTwoExploration(undefined, () => 0);
    const before = system.getState();
    expect(system.search('missing')).toEqual({ ok: false, reason: 'UNKNOWN LOCATION' });
    expect(system.getState()).toEqual(before);
  });
  it('spends time and marks the location searched even when no loot is found', () => {
    const system = createDayTwoExploration(undefined, () => 0.99);
    system.search('gas');
    expect(system.getState().resources).toEqual({ food: 0, ammo: 0, fuel: 0 });
    expect(system.getState().remainingHours).toBe(9);
    expect(system.canSearch('gas')).toBe(false);
  });
  it('isolates session state from snapshots and other sessions', () => {
    const system = createDayTwoExploration(undefined, () => 0);
    const snapshot = system.getState();
    snapshot.locations[0].searched = true;
    snapshot.resources.food = 100;
    system.search('gas');
    const fresh = createDayTwoExploration(undefined, () => 0);
    expect(fresh.getState().remainingHours).toBe(12);
    expect(fresh.canSearch('gas')).toBe(true);
    expect(system.canSearch('grocery')).toBe(true);
    expect(system.getState().resources.food).toBeLessThan(100);
  });
});
