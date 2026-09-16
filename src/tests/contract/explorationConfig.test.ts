import { describe, expect, it } from 'vitest';
import { EXPLORATION_HOURS, HAZARD_LOCATIONS } from '../../config/explorationConfig';

describe('Hazard exploration configuration', () => {
  it('provides unique selectable locations inside the map', () => {
    expect(HAZARD_LOCATIONS.length).toBeGreaterThan(0);
    expect(new Set(HAZARD_LOCATIONS.map(location => location.id)).size).toBe(HAZARD_LOCATIONS.length);
    for (const location of HAZARD_LOCATIONS) {
      expect(location.x).toBeGreaterThan(0);
      expect(location.x).toBeLessThan(1);
      expect(location.y).toBeGreaterThan(0);
      expect(location.y).toBeLessThan(1);
    }
  });
  it('requires choosing locations within a twelve hour budget', () => {
    expect(EXPLORATION_HOURS).toBe(12);
    expect(HAZARD_LOCATIONS.reduce((sum, location) => sum + location.searchHours, 0)).toBeGreaterThan(EXPLORATION_HOURS);
    for (const location of HAZARD_LOCATIONS) {
      expect(Number.isInteger(location.searchHours)).toBe(true);
      expect(location.searchHours).toBeGreaterThan(0);
      expect(location.searchHours).toBeLessThanOrEqual(EXPLORATION_HOURS);
    }
  });
  it('defines valid probabilities and inclusive nonnegative integer loot bounds', () => {
    for (const location of HAZARD_LOCATIONS) {
      for (const rule of Object.values(location.lootTable)) {
        expect(rule.chance).toBeGreaterThanOrEqual(0);
        expect(rule.chance).toBeLessThanOrEqual(1);
        expect(Number.isInteger(rule.min)).toBe(true);
        expect(Number.isInteger(rule.max)).toBe(true);
        expect(rule.min).toBeGreaterThanOrEqual(0);
        expect(rule.max).toBeGreaterThanOrEqual(rule.min);
      }
    }
  });
});
