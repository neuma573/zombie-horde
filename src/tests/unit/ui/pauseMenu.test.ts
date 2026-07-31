import { describe, expect, it } from 'vitest';

import {
  clampPauseActionWidth,
  createPauseMenuActionLayout,
  isPointInBounds,
  pauseButtonBounds,
} from '../../../logic/pauseMenu';

describe('pause menu input boundary', () => {
  it('places the pause dead zone inside the mobile safe area', () => {
    const bounds = pauseButtonBounds({
      width: 390,
      safeArea: { top: 12, right: 8 },
    });

    expect(bounds).toEqual({ left: 294, right: 370, top: 23, bottom: 61 });
    expect(isPointInBounds({ x: 332, y: 42 }, bounds)).toBe(true);
  });

  it('does not consume aiming immediately outside the pause button', () => {
    const bounds = pauseButtonBounds({
      width: 390,
      safeArea: { top: 12, right: 8 },
    });

    expect(isPointInBounds({ x: 293, y: 42 }, bounds)).toBe(false);
    expect(isPointInBounds({ x: 332, y: 62 }, bounds)).toBe(false);
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
});
