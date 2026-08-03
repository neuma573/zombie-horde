import { describe, expect, it } from 'vitest';

import type { GameUiLayout, GameUiLayoutInput } from '../../logic/gameUiLayout';
import {
  ResponsiveUiSystem,
  type ResponsiveHudTarget,
  type ResponsiveMobileControlsTarget,
  type ResponsivePauseTarget,
} from '../../systems/ResponsiveUiSystem';

class HudTarget implements ResponsiveHudTarget {
  mobileInput = false;
  layout?: GameUiLayout['hud'];
  desktopHoverVisible = true;

  setMobileInputMode(enabled: boolean): void {
    this.mobileInput = enabled;
    if (enabled) this.desktopHoverVisible = false;
  }

  applyLayout(
    _width: number,
    _height: number,
    _safeArea: GameUiLayoutInput['safeArea'],
    layout: GameUiLayout['hud'],
  ): void {
    this.layout = layout;
  }
}

class PauseTarget implements ResponsivePauseTarget {
  bounds: GameUiLayout['pauseButton'] = null;
  visible = false;

  resize(
    _layout: Omit<GameUiLayoutInput, 'mobileControls'>,
    pauseBounds: GameUiLayout['pauseButton'],
  ): void {
    this.bounds = pauseBounds;
  }

  setMobileVisible(visible: boolean): void {
    this.visible = visible;
  }
}

class MobileControlsTarget implements ResponsiveMobileControlsTarget {
  visible = false;
  layout: GameUiLayout['mobileControlsLayout'] = null;

  setVisible(visible: boolean): void {
    this.visible = visible;
  }

  setLayout(layout: NonNullable<GameUiLayout['mobileControlsLayout']>): void {
    this.layout = layout;
  }
}

describe('ResponsiveUiSystem', () => {
  it('atomically replaces desktop presentation with mobile presentation', () => {
    const hud = new HudTarget();
    const pause = new PauseTarget();
    const controls = new MobileControlsTarget();
    const system = new ResponsiveUiSystem(hud, pause, controls);
    const desktop = system.apply({
      width: 960,
      height: 540,
      safeArea: { top: 0, right: 0, bottom: 0, left: 0 },
      mobileControls: false,
    }, true);

    const mobile = system.apply({
      width: 390,
      height: 844,
      safeArea: { top: 47, right: 0, bottom: 34, left: 0 },
      mobileControls: true,
    }, true);

    expect(desktop.pauseButton).toBeNull();
    expect(mobile.pauseButton).not.toBeNull();
    expect(hud.layout).toEqual(mobile.hud);
    expect(hud.mobileInput).toBe(true);
    expect(hud.desktopHoverVisible).toBe(false);
    expect(pause.bounds).toEqual(mobile.pauseButton);
    expect(pause.visible).toBe(true);
    expect(controls.layout).toEqual(mobile.mobileControlsLayout);
    expect(controls.visible).toBe(true);
  });

  it('removes mobile-only pause presentation when returning to desktop', () => {
    const hud = new HudTarget();
    const pause = new PauseTarget();
    const controls = new MobileControlsTarget();
    const system = new ResponsiveUiSystem(hud, pause, controls);
    system.apply({
      width: 390,
      height: 844,
      safeArea: { top: 47, right: 0, bottom: 34, left: 0 },
      mobileControls: true,
    }, true);

    const desktop = system.apply({
      width: 960,
      height: 540,
      safeArea: { top: 0, right: 0, bottom: 0, left: 0 },
      mobileControls: false,
    }, true);

    expect(hud.layout).toEqual(desktop.hud);
    expect(hud.mobileInput).toBe(false);
    expect(pause.bounds).toBeNull();
    expect(pause.visible).toBe(false);
    expect(controls.visible).toBe(false);
  });
});
