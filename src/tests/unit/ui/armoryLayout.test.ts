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


describe('armory companion preparation layout', () => {
  it.each([[320, 360], [390, 844], [844, 390], [1280, 800]])(
    'separates the full roster, rack and deployment controls at %i by %i', (width, height) => {
      const scale = getArmoryViewportScale(width, height, true);
      const boardWidth = Math.min(height > width ? 580 : 1160, width / scale - 32);
      const boardHeight = Math.min(820, height / scale - 64);
      const headerHeight = boardWidth < 600 ? 222 : 156;
      const layout = getArmoryControlsLayout(boardWidth, boardHeight, headerHeight);
      expect(layout.viewport.y).toBeGreaterThanOrEqual(headerHeight);
      expect(layout.viewport.height).toBeGreaterThanOrEqual(72);
      expect(layout.viewport.width).toBeGreaterThanOrEqual(72);
      expect(layout.slotHeight).toBeGreaterThanOrEqual(44);
      const slotsBottom = layout.slotY + (layout.side ? layout.slotHeight * 2 + 10 : layout.slotHeight);
      expect(slotsBottom).toBeLessThanOrEqual(layout.buttonY - 26);
      expect(layout.buttonY + 44).toBeLessThanOrEqual(boardHeight);
    },
  );
});


describe('armory desktop roster beside the rack', () => {
  it.each([[960, 560], [1160, 680], [1160, 820]])(
    'separates the roster, weapons, slots and start button at %i by %i', (width, height) => {
      const layout = getArmoryControlsLayout(width, height, 156, 'left');
      expect(layout.desktop).toBe(true);
      const rosterRight = 20 + 236;
      const rosterBottom = 88 + 4 * 86 + 78;
      expect(layout.viewport.x).toBeGreaterThan(rosterRight);
      expect(rosterBottom).toBeLessThan(height - 20);
      expect(layout.viewport.y + layout.viewport.height).toBeLessThan(layout.slotY);
      expect(layout.controlsX).toBeGreaterThan(rosterRight);
      expect(layout.controlsX + layout.controlsWidth).toBeLessThan(layout.buttonX);
      expect(layout.slotY + layout.slotHeight).toBeLessThanOrEqual(height - 20);
      expect(layout.buttonX + layout.buttonWidth).toBeLessThanOrEqual(width - 20);
      expect(layout.buttonY + 44).toBeLessThanOrEqual(height - 16);
    },
  );

  it('keeps the top roster layout when the screen cannot fit a side roster', () => {
    const layout = getArmoryControlsLayout(580, 780, 222, 'left');
    expect(layout.desktop).toBe(false);
    expect(layout.viewport.y).toBeGreaterThanOrEqual(222);
  });
});
