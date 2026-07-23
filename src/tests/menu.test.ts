import { describe, expect, it } from 'vitest';

import {
  CHARACTER_CLASS_OPTIONS,
  DEFAULT_GAME_SETTINGS,
} from '../config/menuConfig';
import {
  createMobileClassCardLayout,
  createMenuActionLayout,
  selectCharacterClass,
  toggleSound,
} from '../logic/menu';

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

  it('keeps class-select actions separated on a 360px phone safe area', () => {
    const layout = createMenuActionLayout(24, 336);
    const backRight = layout.back.x + layout.back.width / 2;
    const deployLeft = layout.deploy.x - layout.deploy.width / 2;

    expect(layout.back).toEqual({ x: 94, width: 140 });
    expect(layout.deploy).toEqual({ x: 256, width: 160 });
    expect(deployLeft - backRight).toBe(12);
  });

  it('shrinks both class-select actions when the safe width is narrower', () => {
    const layout = createMenuActionLayout(24, 224);
    const backRight = layout.back.x + layout.back.width / 2;
    const deployLeft = layout.deploy.x - layout.deploy.width / 2;

    expect(layout.back.width).toBe(94);
    expect(layout.deploy.width).toBe(94);
    expect(deployLeft - backRight).toBe(12);
  });

  it('fits mobile class cards above actions on a short landscape viewport', () => {
    const cardTop = 24 + 88;
    const actionY = 296 - 26;
    const actionTop = actionY - 23;
    const layout = createMobileClassCardLayout(cardTop, actionY - 42, 13);
    const firstTop = layout.cardCenters[0] - layout.cardHeight / 2;
    const secondBottom = layout.cardCenters[1] + layout.cardHeight / 2;

    expect(layout.cardHeight).toBe(51.5);
    expect(firstTop).toBe(cardTop);
    expect(secondBottom).toBe(layout.cardBottom);
    expect(secondBottom).toBeLessThan(actionTop);
  });
});
