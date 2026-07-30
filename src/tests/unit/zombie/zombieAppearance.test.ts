import { describe, expect, it } from 'vitest';

import {
  createZombieAppearance,
  zombieAppearanceSeedFromId,
} from '../../../logic/zombieAppearance';

describe('zombie appearance', () => {
  it('is deterministic for a fixed session seed and spawn index', () => {
    expect(createZombieAppearance(0x12345678, 7))
      .toEqual(createZombieAppearance(0x12345678, 7));
  });

  it('produces varied civilian combinations without runtime randomness', () => {
    const appearances = Array.from(
      { length: 240 },
      (_, index) => createZombieAppearance(0x12345678, index),
    );

    expect(new Set(appearances.map(({ archetype }) => archetype))).toEqual(new Set([
      'casualMale',
      'casualFemale',
      'office',
      'worker',
      'athletic',
      'medical',
    ]));
    expect(new Set(appearances.map(({ hair }) => hair)).size).toBe(4);
    expect(new Set(appearances.map(({ bodyType }) => bodyType)).size).toBe(3);
    expect(new Set(appearances.map(({ sleeves }) => sleeves)).size).toBe(2);
    expect(new Set(appearances.map(({ skin }) => skin.base)).size).toBeGreaterThan(2);
  });

  it('makes everyday civilian archetypes the majority of a stable crowd', () => {
    const appearances = Array.from(
      { length: 1_000 },
      (_, index) => createZombieAppearance(0x87654321, index),
    );
    const everydayCount = appearances.filter(({ archetype }) => (
      archetype === 'casualMale' || archetype === 'casualFemale'
    )).length;

    expect(everydayCount).toBeGreaterThan(550);
    expect(everydayCount).toBeLessThan(650);
  });

  it('restricts hair, body type, and sleeves to each archetype preset', () => {
    const appearances = Array.from(
      { length: 500 },
      (_, index) => createZombieAppearance(0xabcdef01, index),
    );

    for (const appearance of appearances) {
      if (appearance.archetype === 'casualMale') {
        expect(appearance.hair).not.toBe('ponytail');
        expect(appearance.bodyType).not.toBe('slim');
      }
      if (appearance.archetype === 'worker') {
        expect(appearance.sleeves).toBe('long');
        expect(['bald', 'cropped']).toContain(appearance.hair);
      }
      if (appearance.archetype === 'athletic') {
        expect(appearance.sleeves).toBe('short');
      }
      if (appearance.archetype === 'office') {
        expect(appearance.sleeves).toBe('long');
      }
    }
  });

  it('combines every two-color outfit palette with every hair color', () => {
    const appearances = Array.from(
      { length: 10_000 },
      (_, index) => createZombieAppearance(0x13579bdf, index),
    );

    for (const archetype of ['office', 'worker', 'athletic', 'medical'] as const) {
      const combinations = new Map<number, Set<number>>();
      for (const appearance of appearances) {
        if (appearance.archetype !== archetype) continue;
        const hairColors = combinations.get(appearance.clothing.base) ?? new Set<number>();
        hairColors.add(appearance.hairColor.base);
        combinations.set(appearance.clothing.base, hairColors);
      }

      expect(combinations.size).toBe(2);
      for (const hairColors of combinations.values()) {
        expect(hairColors.size).toBe(4);
      }
    }
  });

  it('derives a stable fallback seed from a zombie id', () => {
    expect(zombieAppearanceSeedFromId('zombie-12'))
      .toBe(zombieAppearanceSeedFromId('zombie-12'));
    expect(zombieAppearanceSeedFromId('zombie-12'))
      .not.toBe(zombieAppearanceSeedFromId('zombie-13'));
  });
});
