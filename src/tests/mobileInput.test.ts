import { describe, expect, it } from 'vitest';

import {
  canRestartWithMobileTouch,
  claimMobilePointer,
  classifyMobilePointer,
  createMobileControlLayout,
  createMobilePointerOwnership,
  didViewportOrientationChange,
  joystickMovement,
  lateClaimMobilePointerRole,
  releaseMobilePointer,
  roleForPointer,
  shouldShowMobileControls,
} from '../logic/mobileInput';

const noInsets = { top: 0, right: 0, bottom: 0, left: 0 };

describe('mobile input', () => {
  it('shows controls from capabilities rather than a user agent', () => {
    expect(shouldShowMobileControls(5, true)).toBe(true);
    expect(shouldShowMobileControls(0, true)).toBe(false);
    expect(shouldShowMobileControls(5, false)).toBe(false);
  });

  it('keeps input for ordinary resize and detects only orientation changes', () => {
    expect(didViewportOrientationChange('portrait', 380, 700)).toBe(false);
    expect(didViewportOrientationChange('landscape', 900, 420)).toBe(false);
    expect(didViewportOrientationChange('portrait', 900, 420)).toBe(true);
    expect(didViewportOrientationChange(undefined, 380, 700)).toBe(false);
  });

  it('requires an armed mobile restart gate and visible mobile controls', () => {
    expect(canRestartWithMobileTouch(true, true)).toBe(true);
    expect(canRestartWithMobileTouch(true, false)).toBe(false);
    expect(canRestartWithMobileTouch(false, true)).toBe(false);
  });

  it('applies a deadzone and clamps joystick movement to length one', () => {
    const joystick = { x: 100, y: 100, radius: 50 };

    expect(joystickMovement({ x: 105, y: 100 }, joystick, 0.2)).toEqual({ x: 0, y: 0 });
    expect(joystickMovement({ x: 150, y: 100 }, joystick, 0.2)).toEqual({ x: 1, y: 0 });
    const diagonal = joystickMovement({ x: 200, y: 200 }, joystick, 0.2);
    expect(Math.hypot(diagonal.x, diagonal.y)).toBeCloseTo(1);
  });

  it('keeps controls inside portrait and landscape safe areas', () => {
    const portrait = createMobileControlLayout(360, 640, { top: 30, right: 0, bottom: 20, left: 0 });
    const landscape = createMobileControlLayout(844, 390, { top: 0, right: 44, bottom: 21, left: 44 });

    for (const [layout, width, height] of [[portrait, 360, 640], [landscape, 844, 390]] as const) {
      for (const control of [layout.joystick, layout.fire, layout.reload]) {
        expect(control.x - control.radius).toBeGreaterThanOrEqual(0);
        expect(control.x + control.radius).toBeLessThanOrEqual(width);
        expect(control.y - control.radius).toBeGreaterThanOrEqual(0);
        expect(control.y + control.radius).toBeLessThanOrEqual(height);
      }
    }

    expect(portrait.joystick.y).toBeGreaterThan(portrait.aimTop);
    expect(portrait.aimTop).toBe(30);
    expect(landscape.aimTop).toBe(0);
    expect(portrait.joystick.y + portrait.joystick.radius).toBeLessThanOrEqual(620);
    expect(landscape.joystick.x - landscape.joystick.radius).toBeGreaterThanOrEqual(44);
    expect(landscape.fire.x).toBeLessThan(844 - 44);
    expect(landscape.fire.x + landscape.fire.radius).toBeLessThanOrEqual(844 - 44);
    expect(landscape.fire.y + landscape.fire.radius).toBeLessThanOrEqual(390 - 21);
  });

  it('classifies controls before aim and excludes only the top safe area', () => {
    const layout = createMobileControlLayout(360, 640, noInsets);

    expect(classifyMobilePointer(layout.joystick, layout)).toBe('movement');
    expect(classifyMobilePointer(layout.fire, layout)).toBe('fire');
    expect(classifyMobilePointer(layout.reload, layout)).toBe('reload');
    expect(classifyMobilePointer({ x: 180, y: 10 }, layout)).toBe('aim');
    expect(classifyMobilePointer({ x: 180, y: 300 }, layout)).toBe('aim');

    const insetLayout = createMobileControlLayout(360, 640, { ...noInsets, top: 30 });
    expect(classifyMobilePointer({ x: 180, y: 29 }, insetLayout)).toBeNull();
    expect(classifyMobilePointer({ x: 180, y: 30 }, insetLayout)).toBe('aim');
  });

  it('uses larger action targets and neutral guard bands around right-side controls', () => {
    const layout = createMobileControlLayout(360, 640, noInsets);
    const fireActionPoint = {
      x: layout.fire.x + layout.fire.radius + 2,
      y: layout.fire.y,
    };
    const fireGuardPoint = {
      x: layout.fire.x - layout.fireHit.radius - 2,
      y: layout.fire.y,
    };
    const reloadGuardPoint = {
      x: layout.reload.x - layout.reloadHit.radius - 2,
      y: layout.reload.y,
    };
    const emptyPanelPoint = {
      x: layout.controlExclusion.x + layout.controlExclusion.width - 1,
      y: layout.reload.y,
    };
    const aimPointBesidePanel = {
      x: layout.controlExclusion.x - 1,
      y: layout.fire.y,
    };

    expect(layout.fireHit.radius).toBeGreaterThan(layout.fire.radius);
    expect(layout.fireGuard.radius).toBeGreaterThan(layout.fireHit.radius);
    expect(layout.reloadHit.radius).toBeGreaterThan(layout.reload.radius);
    expect(layout.reloadGuard.radius).toBeGreaterThan(layout.reloadHit.radius);
    expect(classifyMobilePointer(fireActionPoint, layout)).toBe('fire');
    expect(classifyMobilePointer(fireGuardPoint, layout)).toBe('controlGuard');
    expect(classifyMobilePointer(reloadGuardPoint, layout)).toBe('controlGuard');
    expect(classifyMobilePointer(emptyPanelPoint, layout)).toBe('controlGuard');
    expect(classifyMobilePointer(aimPointBesidePanel, layout)).toBe('aim');
    expect(Math.abs(layout.fire.y - layout.reload.y)).toBeGreaterThanOrEqual(
      layout.fireHit.radius + layout.reloadHit.radius,
    );
  });

  it('keeps exclusive pointer ownership until release', () => {
    let ownership = createMobilePointerOwnership();
    ownership = claimMobilePointer(ownership, 10, 'movement');
    const unchanged = claimMobilePointer(ownership, 10, 'aim');
    const occupied = claimMobilePointer(unchanged, 11, 'movement');
    ownership = claimMobilePointer(occupied, 12, 'aim');

    expect(roleForPointer(ownership, 10)).toBe('movement');
    expect(roleForPointer(ownership, 12)).toBe('aim');
    expect(roleForPointer(ownership, 11)).toBeNull();

    ownership = releaseMobilePointer(ownership, 10);
    expect(roleForPointer(ownership, 10)).toBeNull();
    expect(claimMobilePointer(ownership, 11, 'movement').movement).toBe(11);
  });

  it('allows only aim ownership for a pointer claimed after pointerdown', () => {
    expect(lateClaimMobilePointerRole('aim')).toBe('aim');
    expect(lateClaimMobilePointerRole('movement')).toBeNull();
    expect(lateClaimMobilePointerRole('fire')).toBeNull();
    expect(lateClaimMobilePointerRole('reload')).toBeNull();
    expect(lateClaimMobilePointerRole('controlGuard')).toBeNull();
    expect(lateClaimMobilePointerRole(null)).toBeNull();
  });
});
