import { describe, expect, it } from 'vitest';
import { createHudLayout, fitClockRenderScale } from '../../../logic/hud';

describe('createHudLayout', () => {
  it('stacks status blocks inside portrait safe areas', () => {
    const layout = createHudLayout(360, 640, { top: 30, right: 0, bottom: 20, left: 0 });

    expect(layout.status).toEqual({ x: 114, y: 42 });
    expect(layout.ammo).toEqual({ x: 246, y: 56, originX: 0 });
    expect(layout.time).toEqual({ x: 180, y: 42, width: 116, height: 48 });
    expect(layout.gameOver.x).toBe(180);
    expect(layout.gameOver.y).toBe(325);
    expect(layout.reload.width).toBeGreaterThanOrEqual(150);
    expect(layout.reload.x).toBeGreaterThanOrEqual(12);
    expect(layout.weaponSlots).toEqual([
      { x: 153, y: 120, width: 46, height: 46 },
      { x: 207, y: 120, width: 46, height: 46 },
    ]);
    expect(layout.topHudBounds).toEqual({
      left: 0,
      right: 360,
      top: 42,
      bottom: 90,
    });
  });

  it('splits status blocks across a wide landscape safe area', () => {
    const layout = createHudLayout(960, 540, { top: 0, right: 24, bottom: 0, left: 24 });

    expect(layout.status).toEqual({ x: 414, y: 12 });
    expect(layout.ammo).toEqual({ x: 546, y: 26, originX: 0 });
    expect(layout.time).toEqual({ x: 480, y: 12, width: 116, height: 48 });
    expect(layout.gameOver).toEqual({ x: 480, y: 270 });
    expect(layout.reload.x).toBeCloseTo(329.04);
    expect(layout.reload.y).toBe(318);
    expect(layout.reload.width).toBeCloseTo(301.92);
    expect(layout.reload.height).toBe(10);
    expect(layout.waveBanner.x).toBe(480);
  });

  it('keeps the wave banner inside a height-constrained safe area', () => {
    const layout = createHudLayout(
      360,
      100,
      { top: 0, right: 0, bottom: 0, left: 0 },
    );

    expect(layout.waveBanner).toEqual({ x: 180, y: 64 });
    expect(layout.waveBanner.y - 24).toBeGreaterThanOrEqual(12);
    expect(layout.waveBanner.y + 24).toBeLessThanOrEqual(88);
  });

  it('fits weapon slots beside a reserved pause column on narrow screens', () => {
    const layout = createHudLayout(
      159,
      160,
      { top: 0, right: 0, bottom: 0, left: 0 },
    );
    const secondSlot = layout.weaponSlots[1];

    expect(secondSlot.x + secondSlot.width / 2).toBeLessThanOrEqual(111);
    expect(layout.weaponSlots[0].width).toBe(46);
    expect(layout.weaponSlots[1].width).toBe(46);
  });

  it('reserves the pause column from the top HUD in very short views', () => {
    const layout = createHudLayout(
      200,
      100,
      { top: 0, right: 0, bottom: 0, left: 0 },
    );

    expect(layout.time).toEqual({ x: 78, y: 12, width: 116, height: 48 });
    expect(layout.ammo).toEqual({ x: 144, y: 26, originX: 1 });
    expect(layout.topHudBounds).toEqual({
      left: 0,
      right: 152,
      top: 12,
      bottom: 60,
    });
  });

  it('scales the clock contents to its constrained background width', () => {
    const layout = createHudLayout(
      100,
      100,
      { top: 0, right: 0, bottom: 0, left: 0 },
    );
    const renderScale = fitClockRenderScale(layout.time.width);

    expect(layout.time.width).toBe(32);
    expect(67 * renderScale).toBeLessThanOrEqual(layout.time.width - 12);
  });

  it('stacks weapon slots without shrinking their touch targets', () => {
    const layout = createHudLayout(
      60,
      844,
      { top: 0, right: 0, bottom: 0, left: 0 },
    );

    expect(layout.weaponSlots[0].width).toBe(44);
    expect(layout.weaponSlots[1].width).toBe(44);
    expect(layout.weaponSlots[0].x).toBe(layout.weaponSlots[1].x);
    expect(layout.weaponSlots[1].y).toBeGreaterThan(
      layout.weaponSlots[0].y + layout.weaponSlots[0].height / 2,
    );
  });
});
