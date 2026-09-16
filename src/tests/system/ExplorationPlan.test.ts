import { describe, expect, it } from 'vitest';
import { ExplorationSystem } from '../../systems/ExplorationSystem';

describe('day exploration plan', () => {
  it('keeps the current day unchanged while planning and confirming', () => {
    const system = new ExplorationSystem(undefined, () => 0);
    expect(system.getState().day).toBe(1);
    system.toggleLocation('gas');
    expect(system.getState().day).toBe(1);
    system.confirmPlan();
    expect(system.getState().day).toBe(1);
  });
  it('reserves and releases time without revealing loot or searching locations', () => {
    const system = new ExplorationSystem(undefined, () => { throw Error('Premature loot roll'); });
    expect(system.toggleLocation('gas')).toBe(true);
    expect(system.setRepairHours(2)).toBe(true);
    expect(system.getUnallocatedHours()).toBe(7);
    expect(system.getState().remainingHours).toBe(12);
    expect(system.getState().resources).toEqual({ food: 0, ammo: 0, fuel: 0 });
    expect(system.getState().locations.every(location => !location.searched)).toBe(true);
    expect(system.getState().barricade).toBe(50);
    expect(system.toggleLocation('gas')).toBe(true);
    expect(system.getUnallocatedHours()).toBe(10);
  });
  it('resolves all selected sites and repairs together exactly once', () => {
    const system = new ExplorationSystem(undefined, () => 0);
    system.toggleLocation('gas');
    system.toggleLocation('grocery');
    system.setRepairHours(5);
    expect(system.confirmPlan()).toEqual({ ok: true, locationIds: ['gas', 'grocery'],
      hoursSpent: 12, repaired: 25, loot: { food: 3, ammo: 1, fuel: 1 } });
    expect(system.getState().barricade).toBe(75);
    expect(system.getState().remainingHours).toBe(0);
    expect(system.getUnallocatedHours()).toBe(0);
    expect(system.getState().locations.filter(location => location.searched).map(location => location.id)).toEqual(['grocery', 'gas']);
    const before = system.getState();
    expect(system.confirmPlan()).toBeNull();
    expect(system.toggleLocation('pharmacy')).toBe(false);
    expect(system.setRepairHours(0)).toBe(false);
    expect(system.search('pharmacy').ok).toBe(false);
    expect(system.getState()).toEqual(before);
  });
  it('rejects over-budget additions and repair allocations without changing the plan', () => {
    const system = new ExplorationSystem();
    system.toggleLocation('police');
    system.setRepairHours(5);
    const before = system.getState();
    expect(system.toggleLocation('gas')).toBe(false);
    expect(system.setRepairHours(8)).toBe(false);
    expect(system.toggleLocation('missing')).toBe(false);
    expect(system.getState()).toEqual(before);
    expect(system.toggleLocation('pharmacy')).toBe(true);
    expect(system.getUnallocatedHours()).toBe(0);
  });
  it('allows repair-only plans and caps the barricade at full strength', () => {
    const system = new ExplorationSystem();
    expect(system.setRepairHours(11)).toBe(false);
    expect(system.setRepairHours(10)).toBe(true);
    expect(system.confirmPlan()?.repaired).toBe(50);
    expect(system.getState().barricade).toBe(100);
    expect(system.getState().remainingHours).toBe(2);
    expect(system.toggleLocation('pharmacy')).toBe(false);
  });
  it('rejects empty plans and invalid repair hours', () => {
    const system = new ExplorationSystem();
    expect(system.confirmPlan()).toBeNull();
    for (const hours of [-1, 0.5, NaN, Infinity]) expect(system.setRepairHours(hours)).toBe(false);
    expect(system.getState().confirmed).toBe(false);
  });
});
