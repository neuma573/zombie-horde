import { describe, expect, it } from 'vitest';

import {
  CHARACTER_CLASS_OPTIONS,
  DEFAULT_GAME_SETTINGS,
} from '../config/menuConfig';
import { selectCharacterClass, toggleSound } from '../logic/menu';

describe('main menu state', () => {
  it('toggles sound without mutating the existing global setting', () => {
    const settings = { ...DEFAULT_GAME_SETTINGS };
    const muted = toggleSound(settings);

    expect(muted).toEqual({ soundEnabled: false });
    expect(toggleSound(muted)).toEqual({ soundEnabled: true });
    expect(settings).toEqual({ soundEnabled: true });
  });

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
        expect.stringContaining('male.png'),
        expect.stringContaining('female.png'),
      ]),
    );
    expect(CHARACTER_CLASS_OPTIONS.map(({ name }) => name)).toEqual([
      'JOHN DOE',
      'JANE DOE',
    ]);
  });

  it('keeps exactly one valid class selected at a time', () => {
    const first = selectCharacterClass(null, 'male-survivor');
    const second = selectCharacterClass(first, 'female-survivor');

    expect(first).toBe('male-survivor');
    expect(second).toBe('female-survivor');
    expect(selectCharacterClass(second, 'unknown')).toBe(second);
  });
});
