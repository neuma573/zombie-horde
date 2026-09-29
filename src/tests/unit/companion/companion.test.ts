import { describe, expect, it } from 'vitest';
import { createCompanion, searchEfficiency, companionDeathChance, shouldCompanionFlee } from '../../../logic/companion';

describe('companion rules', () => {
  it('generates deterministic names, gender and bounded courage', () => {
    expect(createCompanion('a', 2, () => 0)).toMatchObject({ gender: 'male', firstName: 'James', lastName: 'Miller', courage: 35 });
    expect(createCompanion('b', 2, () => 0.999)).toMatchObject({ gender: 'female', firstName: 'Emily', lastName: 'Hayes', courage: 85 });
  });
  it('reduces efficiency and raises mortality at low courage while groups reduce risk', () => {
    expect(searchEfficiency(0)).toBeLessThan(searchEfficiency(50));
    expect(companionDeathChance(0, 1)).toBeGreaterThan(companionDeathChance(50, 1));
    expect(companionDeathChance(50, 4)).toBeLessThan(companionDeathChance(50, 1));
  });
  it('keeps normal courage at ten percent and maximum courage until collapse', () => {
    expect(shouldCompanionFlee(50, 10.01)).toBe(false);
    expect(shouldCompanionFlee(50, 10)).toBe(false);
    expect(shouldCompanionFlee(50, 9.99)).toBe(true);
    expect(shouldCompanionFlee(100, 0.01)).toBe(false);
    expect(shouldCompanionFlee(100, 0)).toBe(true);
    expect(shouldCompanionFlee(0, 100)).toBe(true);
    expect(shouldCompanionFlee(20, 60)).toBe(true);
  });
});
