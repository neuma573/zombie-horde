import { describe, expect, it } from 'vitest';

import {
  createZombieAppearance,
  zombieAppearanceSeedFromId,
} from '../logic/zombieAppearance';

describe('zombie appearance', () => {
  it('is deterministic for a fixed session seed and spawn index', () => {
    expect(createZombieAppearance(0x12345678, 7))
      .toEqual(createZombieAppearance(0x12345678, 7));
  });

  it('produces varied civilian combinations without runtime randomness', () => {
    const appearances = Array.from(
      { length: 24 },
      (_, index) => createZombieAppearance(0x12345678, index),
    );

    expect(new Set(appearances.map(({ outfit }) => outfit)).size).toBe(4);
    expect(new Set(appearances.map(({ hair }) => hair)).size).toBe(4);
    expect(new Set(appearances.map(({ bodyType }) => bodyType)).size).toBe(3);
    expect(new Set(appearances.map(({ sleeves }) => sleeves)).size).toBe(2);
    expect(new Set(appearances.map(({ skin }) => skin.base)).size).toBeGreaterThan(2);
  });

  it('derives a stable fallback seed from a zombie id', () => {
    expect(zombieAppearanceSeedFromId('zombie-12'))
      .toBe(zombieAppearanceSeedFromId('zombie-12'));
    expect(zombieAppearanceSeedFromId('zombie-12'))
      .not.toBe(zombieAppearanceSeedFromId('zombie-13'));
  });
});
