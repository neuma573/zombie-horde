import { describe, expect, it } from 'vitest';

import { CHARACTER_CLASS_OPTIONS } from '../../config/menuConfig';

describe('menu configuration', () => {
  it('provides exactly two equal-purpose portrait slots', () => {
    expect(CHARACTER_CLASS_OPTIONS).toHaveLength(2);
    expect(new Set(CHARACTER_CLASS_OPTIONS.map(({ id }) => id)).size).toBe(2);
    expect(CHARACTER_CLASS_OPTIONS.every(({
      portraitTextureKey,
      portraitUrl,
      portraitCrop,
    }) => (
      portraitTextureKey.length > 0
      && portraitUrl !== null
      && portraitCrop.width > 0
      && portraitCrop.height > 0
    ))).toBe(true);
    expect(CHARACTER_CLASS_OPTIONS.map(({ portraitUrl }) => portraitUrl)).toEqual(
      expect.arrayContaining([
        expect.stringContaining('male.webp'),
        expect.stringContaining('female.webp'),
      ]),
    );
    expect(CHARACTER_CLASS_OPTIONS.map(({ name }) => name)).toEqual([
      'JOHN DOE',
      'JANE DOE',
    ]);
    for (const { portraitCrop } of CHARACTER_CLASS_OPTIONS) {
      expect(portraitCrop.x + portraitCrop.width).toBeLessThanOrEqual(1_024);
      expect(portraitCrop.y + portraitCrop.height).toBeLessThanOrEqual(1_536);
    }
  });
});
