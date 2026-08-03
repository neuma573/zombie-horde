import { describe, expect, it } from 'vitest';

import {
  clampPauseActionWidth,
  createPauseMenuActionLayout,
  fitPauseTextFontSize,
  isPointInBounds,
  pauseButtonBounds,
} from '../../../logic/pauseMenu';
import { createHudLayout } from '../../../logic/hud';

describe('pause menu input boundary', () => {
  it('places the pause dead zone inside the mobile safe area', () => {
    const bounds = pauseButtonBounds({
      width: 390,
      height: 844,
      safeArea: { top: 12, right: 8, bottom: 0, left: 0 },
    });

    expect(bounds).toEqual({ left: 322, right: 370, top: 75, bottom: 123 });
    expect(isPointInBounds({ x: 346, y: 99 }, bounds)).toBe(true);
  });

  it('does not consume aiming immediately outside the pause button', () => {
    const bounds = pauseButtonBounds({
      width: 390,
      height: 844,
      safeArea: { top: 12, right: 8, bottom: 0, left: 0 },
    });

    expect(isPointInBounds({ x: 321, y: 99 }, bounds)).toBe(false);
    expect(isPointInBounds({ x: 346, y: 124 }, bounds)).toBe(false);
  });

  it('positions the mobile pause target below the ammunition HUD', () => {
    const safeArea = { top: 12, right: 8, bottom: 0, left: 0 };
    const hud = createHudLayout(390, 844, safeArea);
    const pause = pauseButtonBounds({ width: 390, height: 844, safeArea });

    expect(pause.top).toBeGreaterThan(hud.ammo.y + 24);
  });

  it('positions the mobile pause target below overlapping weapon slots', () => {
    const safeArea = { top: 0, right: 0, bottom: 0, left: 0 };
    const hud = createHudLayout(200, 640, safeArea);
    const pause = pauseButtonBounds({ width: 200, height: 640, safeArea });
    const secondSlot = hud.weaponSlots[1];

    expect(pause.top).toBeGreaterThan(
      secondSlot.y + secondSlot.height / 2,
    );
  });

  it('moves the pause target beside weapon slots when space below is short', () => {
    const safeArea = { top: 0, right: 0, bottom: 0, left: 0 };
    const hud = createHudLayout(200, 160, safeArea);
    const pause = pauseButtonBounds({ width: 200, height: 160, safeArea });
    const secondSlot = hud.weaponSlots[1];
    const secondSlotBounds = {
      left: secondSlot.x - secondSlot.width / 2,
      right: secondSlot.x + secondSlot.width / 2,
      top: secondSlot.y - secondSlot.height / 2,
      bottom: secondSlot.y + secondSlot.height / 2,
    };

    expect(pause).toEqual({ left: 152, right: 200, top: 101, bottom: 149 });
    expect(pause.left).toBeGreaterThanOrEqual(secondSlotBounds.right);
  });

  it('keeps constrained pause fallbacks clear of the top HUD', () => {
    const safeArea = { top: 0, right: 0, bottom: 0, left: 0 };
    const hud = createHudLayout(195, 160, safeArea);
    const pause = pauseButtonBounds({ width: 195, height: 160, safeArea });
    const secondSlot = hud.weaponSlots[1];

    expect(pause).toEqual({ left: 147, right: 195, top: 101, bottom: 149 });
    expect(pause.left).toBeGreaterThanOrEqual(
      secondSlot.x + secondSlot.width / 2,
    );
    expect(pause.top).toBeGreaterThanOrEqual(hud.topHudBounds.bottom);
  });

  it('reserves a non-overlapping pause column below 160px wide', () => {
    const safeArea = { top: 0, right: 0, bottom: 0, left: 0 };
    const hud = createHudLayout(159, 160, safeArea);
    const pause = pauseButtonBounds({ width: 159, height: 160, safeArea });
    const secondSlot = hud.weaponSlots[1];

    expect(pause).toEqual({ left: 111, right: 159, top: 101, bottom: 149 });
    expect(pause.left).toBeGreaterThanOrEqual(
      secondSlot.x + secondSlot.width / 2,
    );
  });

  it('uses the reserved pause column in very short views', () => {
    const safeArea = { top: 0, right: 0, bottom: 0, left: 0 };
    const hud = createHudLayout(200, 100, safeArea);
    const pause = pauseButtonBounds({ width: 200, height: 100, safeArea });

    expect(pause).toEqual({ left: 152, right: 200, top: 41, bottom: 89 });
    expect(pause.left).toBeGreaterThanOrEqual(hud.topHudBounds.right);
    expect(pause.left).toBeGreaterThanOrEqual(
      hud.weaponSlots[1].x + hud.weaponSlots[1].width / 2,
    );
  });

  it('keeps compact pause actions inside a 240px viewport safe area', () => {
    const top = 24;
    const bottom = 216;
    const layout = createPauseMenuActionLayout(top, bottom, 3);
    const actionBounds = layout.actionYs.map((y) => ({
      top: y - layout.buttonHeight / 2,
      bottom: y + layout.buttonHeight / 2,
    }));

    expect(layout.subtitleY).toBeNull();
    expect(actionBounds[0].top).toBeGreaterThanOrEqual(top);
    expect(actionBounds[2].bottom).toBeLessThanOrEqual(bottom);
    expect(actionBounds[1].top).toBeGreaterThan(actionBounds[0].bottom);
    expect(actionBounds[2].top).toBeGreaterThan(actionBounds[1].bottom);
  });

  it('clamps pause actions to a narrow horizontal safe area', () => {
    const left = 24;
    const right = 176;
    const width = clampPauseActionWidth(220, left, right);
    const centerX = left + (right - left) / 2;

    expect(width).toBe(152);
    expect(centerX - width / 2).toBe(left);
    expect(centerX + width / 2).toBe(right);
  });

  it('fits action labels inside a clamped narrow button', () => {
    const fontSize = fitPauseTextFontSize('MAIN MENU', 32, 16);
    const estimatedTextWidth = fontSize * (8 * 0.7 + 0.35);

    expect(fontSize).toBeLessThan(16);
    expect(estimatedTextWidth).toBeLessThanOrEqual(24);
    expect(fitPauseTextFontSize('RESUME', 220, 16)).toBe(16);
  });

  it('fits pause headings inside the same narrow safe width', () => {
    const pausedSize = fitPauseTextFontSize('PAUSED', 32, 36);
    const settingsSize = fitPauseTextFontSize('SETTINGS', 32, 32);

    expect(pausedSize * (6 * 0.7)).toBeLessThanOrEqual(24);
    expect(settingsSize * (8 * 0.7)).toBeLessThanOrEqual(24);
  });

  it('clamps the mobile pause button to both horizontal safe edges', () => {
    const bounds = pauseButtonBounds({
      width: 80,
      height: 844,
      safeArea: { top: 0, right: 0, bottom: 0, left: 0 },
    });

    expect(bounds).toEqual({ left: 20, right: 68, top: 63, bottom: 111 });
  });

  it('shrinks the mobile pause button between vertical safe edges', () => {
    const bounds = pauseButtonBounds({
      width: 390,
      height: 48,
      safeArea: { top: 0, right: 0, bottom: 0, left: 0 },
    });

    expect(bounds).toEqual({ left: 342, right: 390, top: 11, bottom: 37 });
  });

  it('shrinks the mobile pause control on an extremely narrow viewport', () => {
    const bounds = pauseButtonBounds({
      width: 30,
      height: 844,
      safeArea: { top: 0, right: 0, bottom: 0, left: 0 },
    });
    expect(bounds).toEqual({ left: 12, right: 18, top: 63, bottom: 111 });
  });
});
