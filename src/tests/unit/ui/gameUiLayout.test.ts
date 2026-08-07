import { describe, expect, it } from 'vitest';

import {
  createGameUiLayout,
  MINIMUM_SUPPORTED_VIEWPORT,
} from '../../../logic/gameUiLayout';

describe('createGameUiLayout', () => {
  it('creates a pause target only for mobile controls', () => {
    const desktop = createGameUiLayout({
      width: 360,
      height: 640,
      safeArea: { top: 0, right: 0, bottom: 0, left: 0 },
      mobileControls: false,
    });
    const mobile = createGameUiLayout({
      width: 360,
      height: 640,
      safeArea: { top: 0, right: 0, bottom: 0, left: 0 },
      mobileControls: true,
    });

    expect(desktop.pauseButton).toBeNull();
    expect(mobile.pauseButton).not.toBeNull();
    expect(mobile.pauseButton!.left).toBeGreaterThanOrEqual(
      mobile.hud.weaponSlots[1].x + mobile.hud.weaponSlots[1].width / 2,
    );
  });

  it('declares the supported responsive viewport boundary', () => {
    const supported = createGameUiLayout({
      ...MINIMUM_SUPPORTED_VIEWPORT,
      safeArea: { top: 0, right: 0, bottom: 0, left: 0 },
      mobileControls: true,
    });
    const unsupported = createGameUiLayout({
      width: MINIMUM_SUPPORTED_VIEWPORT.width - 1,
      height: MINIMUM_SUPPORTED_VIEWPORT.height,
      safeArea: { top: 0, right: 0, bottom: 0, left: 0 },
      mobileControls: true,
    });

    expect(supported.supportedViewport).toBe(true);
    expect(unsupported.supportedViewport).toBe(false);
  });

  it.each([
    [320, 360, { top: 0, right: 0, bottom: 0, left: 0 }],
    [360, 360, { top: 0, right: 0, bottom: 0, left: 0 }],
    [390, 844, { top: 47, right: 0, bottom: 34, left: 0 }],
    [844, 390, { top: 0, right: 24, bottom: 21, left: 24 }],
  ])('keeps the mobile pause target clear at %dx%d', (width, height, safeArea) => {
    const layout = createGameUiLayout({
      width,
      height,
      safeArea,
      mobileControls: true,
    });
    const pause = layout.pauseButton!;
    const controls = layout.mobileControlsLayout!;
    const reserved = [
      layout.hud.topHudBounds,
      ...layout.hud.weaponSlots.map((slot) => ({
        left: slot.x - slot.width / 2,
        right: slot.x + slot.width / 2,
        top: slot.y - slot.height / 2,
        bottom: slot.y + slot.height / 2,
      })),
      ...[
        controls.fireGuard,
        controls.reloadGuard,
        controls.shoveGuard,
        controls.interactionHit,
        controls.joystick,
      ]
        .map((control) => ({
          left: control.x - control.radius,
          right: control.x + control.radius,
          top: control.y - control.radius,
          bottom: control.y + control.radius,
        })),
    ];

    expect(layout.supportedViewport).toBe(
      width - safeArea.left - safeArea.right >= MINIMUM_SUPPORTED_VIEWPORT.width
      && height - safeArea.top - safeArea.bottom >= MINIMUM_SUPPORTED_VIEWPORT.height,
    );
    expect(layout.pauseButton).not.toBeNull();
    expect(pause.left).toBeGreaterThanOrEqual(safeArea.left);
    expect(pause.right).toBeLessThanOrEqual(width - safeArea.right);
    expect(pause.top).toBeGreaterThanOrEqual(safeArea.top);
    expect(pause.bottom).toBeLessThanOrEqual(height - safeArea.bottom);
    for (const area of reserved) {
      const overlaps = pause.left < area.right
        && pause.right > area.left
        && pause.top < area.bottom
        && pause.bottom > area.top;
      expect(overlaps).toBe(false);
    }
  });
});
