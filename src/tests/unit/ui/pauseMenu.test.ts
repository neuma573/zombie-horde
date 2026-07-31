import { describe, expect, it } from 'vitest';

import { isPointInBounds, pauseButtonBounds } from '../../../logic/pauseMenu';

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
});
