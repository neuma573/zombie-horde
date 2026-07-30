import { describe, expect, it } from 'vitest';
import { createHudLayout } from '../../../logic/hud';

describe('createHudLayout', () => {
  it('stacks status blocks inside portrait safe areas', () => {
    const layout = createHudLayout(360, 640, { top: 30, right: 0, bottom: 20, left: 0 });

    expect(layout.status).toEqual({ x: 114, y: 42 });
    expect(layout.ammo).toEqual({ x: 246, y: 56 });
    expect(layout.time).toEqual({ x: 180, y: 42, width: 116, height: 48 });
    expect(layout.gameOver.x).toBe(180);
    expect(layout.gameOver.y).toBe(325);
    expect(layout.reload.width).toBeGreaterThanOrEqual(150);
    expect(layout.reload.x).toBeGreaterThanOrEqual(12);
  });

  it('splits status blocks across a wide landscape safe area', () => {
    const layout = createHudLayout(960, 540, { top: 0, right: 24, bottom: 0, left: 24 });

    expect(layout.status).toEqual({ x: 414, y: 12 });
    expect(layout.ammo).toEqual({ x: 546, y: 26 });
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
});