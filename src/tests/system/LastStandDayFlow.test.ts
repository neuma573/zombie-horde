import { describe, expect, it } from 'vitest';
import { ExplorationSystem } from '../../systems/ExplorationSystem';

describe('Last Stand day progression', () => {
  it('blocks all exploration and repair planning before surviving the first night', () => {
    const system = new ExplorationSystem();
    const initial = system.getState();
    expect(initial.day).toBe(1);
    expect(system.search('gas')).toEqual({ ok: false, reason: 'SURVIVE THE FIRST NIGHT' });
    expect(system.toggleLocation('gas')).toBe(false);
    expect(system.setRepairHours(2)).toBe(false);
    expect(system.confirmPlan()).toBeNull();
    expect(system.hasSearchableLocations()).toBe(false);
    expect(system.hasPlannableLocations()).toBe(false);
    expect(system.getState()).toEqual(initial);
  });

  it('unlocks twelve hours of exploration on Day 2 with the remaining barricade', () => {
    const system = new ExplorationSystem();
    expect(system.completeNight(1, 37)).toBe(true);
    expect(system.getState()).toMatchObject({ day: 2, barricade: 37, remainingHours: 12, confirmed: false });
    expect(system.canSearch('gas')).toBe(true);
    expect(system.toggleLocation('gas')).toBe(true);
    expect(system.setRepairHours(2)).toBe(true);
  });

  it('preserves loot and searched sites while resetting the next day plan', () => {
    const system = new ExplorationSystem(undefined, () => 0);
    system.completeNight(1, 50);
    system.toggleLocation('gas');
    system.setRepairHours(2);
    system.confirmPlan();
    const previous = system.getState();
    expect(system.completeNight(2, 41)).toBe(true);
    expect(system.getState()).toMatchObject({ day: 3, barricade: 41, remainingHours: 12,
      plannedLocationIds: [], repairHours: 0, confirmed: false, resources: previous.resources,
      locations: previous.locations });
  });

  it('ignores duplicate and invalid night results without advancing another day', () => {
    const system = new ExplorationSystem();
    expect(system.completeNight(1, NaN)).toBe(false);
    expect(system.completeNight(1, 101)).toBe(false);
    expect(system.completeNight(1, 0)).toBe(true);
    const nextDay = system.getState();
    expect(system.completeNight(1, 50)).toBe(false);
    expect(system.getState()).toEqual(nextDay);
  });
});
