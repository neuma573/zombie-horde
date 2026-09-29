import { describe, expect, it } from 'vitest';
import { ExplorationSystem } from '../../systems/ExplorationSystem';

function createDayTwoExploration(...args: ConstructorParameters<typeof ExplorationSystem>) {
  const system = new ExplorationSystem(...args);
  system.completeNight(1, system.getState().barricade);
  return system;
}

describe('day exploration plan', () => {
  it('keeps the current day unchanged while planning and confirming', () => {
    const system = createDayTwoExploration(undefined, () => 0);
    expect(system.getState().day).toBe(2);
    system.toggleLocation('gas');
    expect(system.getState().day).toBe(2);
    system.confirmPlan();
    expect(system.getState().day).toBe(2);
  });
  it('reserves and releases time without revealing loot or searching locations', () => {
    const system = createDayTwoExploration(undefined, () => { throw Error('Premature loot roll'); });
    expect(system.toggleLocation('gas')).toBe(true);
    expect(system.setTeamRepairHours(2)).toBe(true);
    expect(system.getUnallocatedHours()).toBe(7);
    expect(system.getState().remainingHours).toBe(12);
    expect(system.getState().resources).toEqual({ food: 0, ammo: 0, fuel: 0 });
    expect(system.getState().locations.every(location => !location.searched)).toBe(true);
    expect(system.getState().barricade).toBe(50);
    expect(system.toggleLocation('gas')).toBe(true);
    expect(system.getUnallocatedHours()).toBe(10);
  });
  it('resolves all selected sites and repairs together exactly once', () => {
    const system = createDayTwoExploration(undefined, () => 0);
    system.toggleLocation('gas');
    system.toggleLocation('grocery');
    system.setTeamRepairHours(5);
    expect(system.confirmPlan()).toEqual({ ok: true, locationIds: ['gas', 'grocery'],
      hoursSpent: 12, repaired: 25, loot: { food: 3, ammo: 1, fuel: 1 } });
    expect(system.getState().barricade).toBe(75);
    expect(system.getState().remainingHours).toBe(0);
    expect(system.getUnallocatedHours()).toBe(0);
    expect(system.getState().locations.filter(location => location.searched).map(location => location.id)).toEqual(['grocery', 'gas']);
    const before = system.getState();
    expect(system.confirmPlan()).toBeNull();
    expect(system.toggleLocation('pharmacy')).toBe(false);
    expect(system.setTeamRepairHours(0)).toBe(false);
    expect(system.search('pharmacy').ok).toBe(false);
    expect(system.getState()).toEqual(before);
  });
  it('rejects over-budget additions and repair allocations without changing the plan', () => {
    const system = createDayTwoExploration();
    system.toggleLocation('police');
    system.setTeamRepairHours(5);
    const before = system.getState();
    expect(system.toggleLocation('gas')).toBe(false);
    expect(system.setTeamRepairHours(8)).toBe(false);
    expect(system.toggleLocation('missing')).toBe(false);
    expect(system.getState()).toEqual(before);
    expect(system.toggleLocation('pharmacy')).toBe(true);
    expect(system.getUnallocatedHours()).toBe(0);
  });
  it('allows repair-only plans and caps the barricade at full strength', () => {
    const system = createDayTwoExploration();
    expect(system.setTeamRepairHours(11)).toBe(true);
    expect(system.getTeamRepairHours()).toBe(10);
    expect(system.setTeamRepairHours(10)).toBe(true);
    expect(system.confirmPlan()?.repaired).toBe(50);
    expect(system.getState().barricade).toBe(100);
    expect(system.getState().remainingHours).toBe(2);
    expect(system.toggleLocation('pharmacy')).toBe(false);
  });
  it('rejects direct searches when all hours are reserved and preserves plan confirmation', () => {
    const system = createDayTwoExploration(undefined, () => 0);
    system.toggleLocation('gas');
    system.setTeamRepairHours(9);
    const before = system.getState();

    expect(system.canSearch('pharmacy')).toBe(false);
    expect(system.search('pharmacy')).toEqual({ ok: false, reason: 'PLAN ACTIVE' });
    expect(system.getState()).toEqual(before);
    expect(system.getUnallocatedHours()).toBe(0);
    expect(system.confirmPlan()).toMatchObject({ locationIds: ['gas'], hoursSpent: 12, repaired: 45 });
    expect(system.getState().remainingHours).toBe(0);
  });

  it('keeps planned locations unsearched until the plan is confirmed', () => {
    const system = createDayTwoExploration(undefined, () => 0);
    system.toggleLocation('gas');
    const before = system.getState();

    expect(system.search('gas')).toEqual({ ok: false, reason: 'PLAN ACTIVE' });
    expect(system.getState()).toEqual(before);
    expect(system.confirmPlan()).toMatchObject({ locationIds: ['gas'], hoursSpent: 3 });
  });

  it('allows direct searches again after releasing every planned location', () => {
    const system = createDayTwoExploration(undefined, () => 0);
    system.toggleLocation('gas');
    expect(system.search('pharmacy')).toEqual({ ok: false, reason: 'PLAN ACTIVE' });

    system.toggleLocation('gas');
    expect(system.canSearch('pharmacy')).toBe(true);
    expect(system.search('pharmacy')).toMatchObject({ ok: true, remainingHours: 10 });
  });

  it('blocks direct searches during repair-only plans until their hours are released', () => {
    const system = createDayTwoExploration(undefined, () => 0);
    system.setTeamRepairHours(1);
    const before = system.getState();

    expect(system.search('pharmacy')).toEqual({ ok: false, reason: 'PLAN ACTIVE' });
    expect(system.getState()).toEqual(before);
    system.setTeamRepairHours(0);
    expect(system.search('pharmacy')).toMatchObject({ ok: true, remainingHours: 10 });
  });

  it('offers planning locations after repair allocation despite blocked direct searches', () => {
    const system = createDayTwoExploration(undefined, () => 0);
    system.setTeamRepairHours(1);
    expect(system.canSearch('pharmacy')).toBe(false);
    expect(system.hasPlannableLocations()).toBe(true);
    expect(system.toggleLocation('pharmacy')).toBe(true);
  });

  it('offers only unsearched unplanned locations within the free planning budget', () => {
    const system = createDayTwoExploration(undefined, () => 0);
    system.search('pharmacy');
    system.toggleLocation('gas');
    system.setTeamRepairHours(6);
    expect(system.hasPlannableLocations()).toBe(false);
    system.setTeamRepairHours(5);
    expect(system.hasPlannableLocations()).toBe(true);
    system.toggleLocation('house-a');
    expect(system.hasPlannableLocations()).toBe(false);
    system.confirmPlan();
    expect(system.hasPlannableLocations()).toBe(false);
  });

  it('does not offer a location already included in the plan', () => {
    const system = createDayTwoExploration(undefined, () => 0);
    for (const id of ['gas', 'pharmacy', 'house-a', 'house-b']) system.toggleLocation(id);
    expect(system.getUnallocatedHours()).toBe(3);
    expect(system.hasPlannableLocations()).toBe(false);
  });

  it('allows an empty day after the first night while rejecting invalid repair hours', () => {
    const system = createDayTwoExploration();
    for (const hours of [-1, 0.5, NaN, Infinity]) expect(system.setTeamRepairHours(hours)).toBe(false);
    expect(system.getState().confirmed).toBe(false);
    expect(system.canConfirmPlan()).toBe(true);
    expect(system.confirmPlan()).toEqual({ ok: true, locationIds: [], hoursSpent: 0,
      repaired: 0, loot: { food: 0, ammo: 0, fuel: 0 } });
    expect(system.getState().confirmed).toBe(true);
  });

  it('keeps empty plans locked before the first night', () => {
    const system = new ExplorationSystem();
    const before = system.getState();
    expect(system.canConfirmPlan()).toBe(false);
    expect(system.confirmPlan()).toBeNull();
    expect(system.getState()).toEqual(before);
  });

  it('continues successive nights after exhausting every site with no companions and a full barricade', () => {
    const system = createDayTwoExploration(undefined, () => 0.99);
    for (const location of system.getState().locations) {
      if (!system.canPlanLocation(location.id)) {
        expect(system.confirmPlan()?.ok).toBe(true);
        expect(system.completeNight(system.getState().day, 100)).toBe(true);
      }
      expect(system.toggleLocation(location.id)).toBe(true);
    }
    expect(system.confirmPlan()?.ok).toBe(true);
    expect(system.completeNight(system.getState().day, 100)).toBe(true);
    expect(system.getState().locations.every(location => location.searched)).toBe(true);
    expect(system.companions.getActive()).toEqual([]);
    expect(system.hasPlannableLocations()).toBe(false);
    const resources = system.getState().resources;

    for (let night = 0; night < 2; night++) {
      expect(system.canConfirmPlan()).toBe(true);
      expect(system.confirmPlan()).toEqual({ ok: true, locationIds: [], hoursSpent: 0,
        repaired: 0, loot: { food: 0, ammo: 0, fuel: 0 } });
      expect(system.getState()).toMatchObject({ confirmed: true, barricade: 100, resources });
      expect(system.getRecoveredWeapons()).toEqual([]);
      const confirmed = system.getState();
      expect(system.canConfirmPlan()).toBe(false);
      expect(system.confirmPlan()).toBeNull();
      expect(system.getState()).toEqual(confirmed);
      expect(system.beginNight(0)).toBe(true);
      expect(system.completeNight(confirmed.day, 100)).toBe(true);
      expect(system.getState().day).toBe(confirmed.day + 1);
    }
  });
});
