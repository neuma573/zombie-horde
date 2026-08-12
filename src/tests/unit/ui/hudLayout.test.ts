import { describe, expect, it } from 'vitest';
import { createHudLayout, fitClockRenderScale } from '../../../logic/hud';

describe('createHudLayout', () => {
  it('stacks status blocks inside portrait safe areas', () => {
    const layout = createHudLayout(360, 640, { top: 30, right: 0, bottom: 20, left: 0 });

    expect(layout.status).toEqual({
      x: 108,
      y: 42,
      originX: 1,
      maxWidth: null,
      maxHeight: 54,
    });
    expect(layout.ammo).toEqual({
      x: 252,
      y: 56,
      originX: 0,
      maxWidth: null,
      maxHeight: 54,
    });
    expect(layout.time).toEqual({ x: 180, y: 42, width: 128, height: 54 });
    expect(layout.waveTag).toEqual({ x: 12, y: 104 });
    expect(layout.healthBar).toEqual({ x: 12, y: 55.5, width: 96, height: 27 });
    expect(layout.staminaBar).toEqual({ x: 252, y: 55.5, width: 96, height: 27 });
    expect(layout.gameOver.x).toBe(180);
    expect(layout.gameOver.y).toBe(325);
    expect(layout.reload.width).toBeGreaterThanOrEqual(150);
    expect(layout.reload.x).toBeGreaterThanOrEqual(12);
    expect(layout.weaponSlots).toEqual([
      { x: 153, y: 126, width: 46, height: 46 },
      { x: 207, y: 126, width: 46, height: 46 },
    ]);
    expect(layout.topHudBounds).toEqual({
      left: 0,
      right: 360,
      top: 42,
      bottom: 96,
    });
  });

  it('splits status blocks across a wide landscape safe area', () => {
    const layout = createHudLayout(960, 540, { top: 0, right: 24, bottom: 0, left: 24 });

    expect(layout.status).toEqual({
      x: 408,
      y: 12,
      originX: 1,
      maxWidth: null,
      maxHeight: 54,
    });
    expect(layout.ammo).toEqual({
      x: 552,
      y: 26,
      originX: 0,
      maxWidth: null,
      maxHeight: 54,
    });
    expect(layout.time).toEqual({ x: 480, y: 12, width: 128, height: 54 });
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

  it('keeps weapon slots centered despite a reserved pause column', () => {
    const layout = createHudLayout(
      159,
      160,
      { top: 0, right: 0, bottom: 0, left: 0 },
    );
    expect(
      (layout.weaponSlots[0].x + layout.weaponSlots[1].x) / 2,
    ).toBeCloseTo(159 / 2);
    expect(layout.weaponSlots[0].width).toBe(46);
    expect(layout.weaponSlots[1].width).toBe(46);
  });

  it('reserves the pause column from the top HUD in very short views', () => {
    const layout = createHudLayout(
      200,
      100,
      { top: 0, right: 0, bottom: 0, left: 0 },
    );

    expect(layout.time.x).toBe(100);
    expect(layout.time.y).toBe(12);
    expect(layout.time.width).toBeCloseTo(36.8);
    expect(layout.time.height).toBe(54);
    expect(layout.ammo.x).toBe(144);
    expect(layout.ammo.y).toBe(26);
    expect(layout.ammo.originX).toBe(1);
    expect(layout.ammo.maxWidth).toBeCloseTo(39.6);
    expect(layout.topHudBounds).toEqual({
      left: 0,
      right: 152,
      top: 12,
      bottom: 66,
    });
  });

  it('scales the clock contents to its constrained background width', () => {
    const layout = createHudLayout(
      100,
      100,
      { top: 0, right: 0, bottom: 0, left: 0 },
    );
    const renderScale = fitClockRenderScale(layout.time.width);

    expect(layout.time.width).toBeCloseTo(6.4);
    expect(67 * renderScale).toBeLessThanOrEqual(layout.time.width);
  });

  it('keeps the clock and weapon group at the absolute viewport center', () => {
    const layout = createHudLayout(
      844,
      390,
      { top: 0, right: 48, bottom: 0, left: 12 },
      { reserveMobilePause: true },
    );

    expect(layout.time.x).toBe(422);
    expect(layout.healthBar.height).toBe(layout.time.height / 2);
    expect(layout.staminaBar.height).toBe(layout.time.height / 2);
    expect(layout.healthBar.x + layout.healthBar.width).toBeLessThan(layout.time.x);
    expect(layout.staminaBar.x).toBeGreaterThan(layout.time.x);
    expect(
      (layout.weaponSlots[0].x + layout.weaponSlots[1].x) / 2,
    ).toBe(422);
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

  it('keeps stacked weapon slots inside short viewports', () => {
    const layout = createHudLayout(
      100,
      160,
      { top: 0, right: 0, bottom: 0, left: 0 },
    );

    expect(layout.weaponSlots[0].y - 22).toBeGreaterThanOrEqual(0);
    expect(layout.weaponSlots[1].y + 22).toBeLessThanOrEqual(160);
  });

  it('keeps constrained status text inside its allocated region', () => {
    const layout = createHudLayout(
      360,
      100,
      { top: 0, right: 0, bottom: 0, left: 0 },
    );

    expect(layout.status.x).toBeGreaterThanOrEqual(0);
    expect(layout.status.originX).toBe(0);
    expect(layout.status.maxWidth).toBeGreaterThan(0);
    expect(layout.status.x + layout.status.maxWidth!).toBeLessThanOrEqual(
      layout.time.x - layout.time.width / 2,
    );
  });

  it('uses vertical safe insets when clamping stacked weapon slots', () => {
    const layout = createHudLayout(
      140,
      120,
      { left: 40, top: 0, right: 0, bottom: 0 },
    );

    expect(layout.weaponSlots[0].y - 22).toBe(24);
    expect(layout.weaponSlots[1].y + 22).toBe(120);
    expect(layout.topHudVisible).toBe(true);
    expect(layout.topHudBounds.bottom).toBeLessThanOrEqual(
      layout.weaponSlots[0].y - 22,
    );
  });

  it('keeps the top HUD when the stacked slots fit below it', () => {
    const layout = createHudLayout(
      100,
      160,
      { top: 0, right: 0, bottom: 0, left: 0 },
    );

    expect(layout.topHudVisible).toBe(true);
    expect(layout.weaponSlots[0].y - 22).toBeGreaterThanOrEqual(
      layout.topHudBounds.bottom,
    );
  });
});
