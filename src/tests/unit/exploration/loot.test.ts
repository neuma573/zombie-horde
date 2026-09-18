import { describe, expect, it } from 'vitest';
import { resourceExpectation, rollLoot } from '../../../logic/exploration';

describe('exploration loot', () => {
  it('awards the inclusive minimum and maximum with controlled randomness', () => {
    const table = { food: { chance: 1, min: 2, max: 7 } };
    expect(rollLoot(table, () => 0)).toEqual({ food: 2, ammo: 0, fuel: 0 });
    expect(rollLoot(table, () => 0.999999)).toEqual({ food: 7, ammo: 0, fuel: 0 });
  });
  it('awards nothing at the probability boundary or for absent resources', () => {
    expect(rollLoot({ ammo: { chance: 0.5, min: 1, max: 4 } }, () => 0.5))
      .toEqual({ food: 0, ammo: 0, fuel: 0 });
  });
  it('never awards a zero probability resource', () => {
    expect(rollLoot({ fuel: { chance: 0, min: 1, max: 2 } }, () => 0).fuel).toBe(0);
  });
  it.each([
    [undefined, 'NONE'], [{ chance: 0, min: 1, max: 2 }, 'NONE'],
    [{ chance: 0.4, min: 1, max: 2 }, 'LOW'],
    [{ chance: 0.5, min: 1, max: 2 }, 'MEDIUM'],
    [{ chance: 0.75, min: 1, max: 2 }, 'HIGH'],
  ] as const)('describes expected resources without exposing probabilities (%j)', (rule, expected) => {
    expect(resourceExpectation(rule)).toBe(expected);
  });
});
