import { describe, expect, it } from 'vitest';
import { getArmoryControlsLayout, getArmoryUiScale, getArmoryViewportScale } from '../../../logic/armoryLayout';

describe('armory UI scale', () => {
  it.each([[568, 250], [568, 200], [844, 250]])(
    'preserves control space on a %i by %i landscape screen', (width, height) => {
      const scale = getArmoryUiScale(width, height);
      expect(scale).toBeGreaterThan(0);
      expect(scale).toBeLessThanOrEqual(1);
      expect(height / scale).toBeGreaterThanOrEqual(360);
      expect(width / scale).toBeGreaterThanOrEqual(360);
    },
  );

  it('reserves vertical space on a short portrait screen', () => {
    const scale = getArmoryUiScale(320, 400);
    expect(400 / scale).toBeGreaterThanOrEqual(600);
    expect(320 / scale).toBeGreaterThanOrEqual(360);
  });

  it.each([[400, 360], [500, 400], [600, 500], [360, 360]])(
    'reserves vertical layout space on a %i by %i near-square screen', (width, height) => {
      const scale = getArmoryUiScale(width, height);
      expect(height / scale).toBeGreaterThanOrEqual(600);
    },
  );

  it('preserves normal phone and desktop control sizes', () => {
    expect(getArmoryUiScale(390, 844)).toBe(1);
    expect(getArmoryUiScale(1280, 800)).toBe(1);
  });
});

describe('armory controls layout', () => {
  it.each([[320, 360], [320, 400], [360, 360], [400, 360], [500, 400], [600, 500], [390, 844], [1280, 800]])(
    'keeps fixed controls readable and separated at %i by %i', (width, height) => {
      expect(getArmoryViewportScale(width, height)).toBe(1);
      const boardWidth = Math.min(height > width ? 580 : 1160, width - 32);
      const boardHeight = Math.min(820, height - 64);
      const layout = getArmoryControlsLayout(boardWidth, boardHeight);
      expect(layout.slotHeight).toBeGreaterThanOrEqual(44);
      expect(layout.viewport.height).toBeGreaterThanOrEqual(72);
      expect(layout.viewport.width).toBeGreaterThanOrEqual(72);
      expect(layout.buttonY + 44).toBeLessThanOrEqual(boardHeight);
      const slotsBottom = layout.slotY + (layout.side ? layout.slotHeight * 2 + 10 : layout.slotHeight);
      expect(slotsBottom).toBeLessThanOrEqual(layout.buttonY);
      if (layout.side) expect(layout.viewport.x + layout.viewport.width).toBeLessThan(layout.controlsX);
      else expect(layout.viewport.y + layout.viewport.height).toBeLessThan(layout.slotY);
    },
  );
});
