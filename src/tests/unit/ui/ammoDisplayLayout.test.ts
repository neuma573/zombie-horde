import { describe, expect, it } from 'vitest';

import {
  createAmmoDisplayLayout,
  createAmmoRoundYPositions,
  createHudLayout,
} from '../../../logic/hud';
import { createMobileControlLayout } from '../../../logic/mobileInput';

describe('createAmmoDisplayLayout', () => {
  it('keeps a full rifle magazine and reserve text inside a desktop safe area', () => {
    const safeArea = { top: 0, right: 24, bottom: 0, left: 24 };
    const hud = createHudLayout(960, 540, safeArea);

    const result = createAmmoDisplayLayout(960, 540, safeArea, hud, 30, false);
    const roundsBottom = result.rounds.feedY
      + result.rounds.step * 29
      + result.rounds.height / 2;

    expect(result.rounds.x + result.rounds.width / 2).toBeLessThanOrEqual(924);
    expect(result.rounds.feedY - result.rounds.height / 2)
      .toBeGreaterThanOrEqual(hud.weaponSlots[0].y + hud.weaponSlots[0].height / 2);
    expect(roundsBottom).toBeLessThanOrEqual(528);
    expect(result.rounds.width).toBe(40);
    expect(result.compact).toBe(false);
  });

  it('keeps a full rifle magazine inside a portrait mobile HUD allocation', () => {
    const safeArea = { top: 30, right: 8, bottom: 20, left: 8 };
    const hud = createHudLayout(360, 640, safeArea, { reserveMobilePause: true });
    const controls = createMobileControlLayout(360, 640, safeArea);

    const result = createAmmoDisplayLayout(
      360,
      640,
      safeArea,
      hud,
      30,
      true,
      controls.interaction,
    );
    const roundsBottom = result.rounds.feedY
      + result.rounds.step * 29
      + result.rounds.height / 2;

    expect(result.rounds.x + result.rounds.width / 2).toBeLessThanOrEqual(340);
    expect(roundsBottom).toBeLessThanOrEqual(440);
    expect(result.rounds.width).toBe(32);
    expect(result.compact).toBe(false);
    expect(result.rounds.x + result.rounds.width / 2).toBeLessThanOrEqual(
      controls.interaction.x - controls.interaction.radius - 6,
    );
  });

  it('uses the constrained allocation without crossing its anchored edge', () => {
    const safeArea = { top: 0, right: 0, bottom: 0, left: 0 };
    const hud = createHudLayout(320, 80, safeArea, { reserveMobilePause: true });
    const controls = createMobileControlLayout(320, 360, safeArea);

    const result = createAmmoDisplayLayout(
      320,
      360,
      safeArea,
      hud,
      17,
      true,
      controls.interaction,
    );

    expect(result.rounds.x + result.rounds.width / 2).toBeLessThanOrEqual(308);
    expect(result.rounds.step).toBeGreaterThanOrEqual(0);
    expect(result.compact).toBe(true);
    expect(result.reserve.x).toBeLessThanOrEqual(
      controls.interaction.x - controls.interaction.radius - 6,
    );
  });

  it('uses mobile control reservations in a wide touch landscape viewport', () => {
    const safeArea = { top: 0, right: 24, bottom: 21, left: 24 };
    const hud = createHudLayout(844, 390, safeArea, { reserveMobilePause: true });

    const result = createAmmoDisplayLayout(844, 390, safeArea, hud, 30, true);
    const roundsBottom = result.rounds.feedY
      + result.rounds.step * 29
      + result.rounds.height / 2;

    expect(result.rounds.width).toBe(32);
    expect(roundsBottom).toBeLessThanOrEqual(189);
    expect(result.compact).toBe(true);
  });
});

describe('createAmmoRoundYPositions', () => {
  it('moves every remaining round one slot toward the feed position after firing', () => {
    const loaded = createAmmoRoundYPositions(120, 8, 5);

    const afterShot = createAmmoRoundYPositions(120, 8, 4);

    expect(afterShot).toEqual(loaded.slice(0, -1).map((y) => y - 8));
    expect(afterShot.at(-1)).toBe(120);
  });
});
