import { describe, expect, it } from 'vitest';

import { TIME_BASED_LIGHTING_CONFIG } from '../config/lightingConfig';
import {
  decayTransientLight,
  dampValue,
  darknessAlphaForTime,
  renderableDarknessAlpha,
  resolveFlashlightEnabled,
} from '../logic/timeBasedLighting';

const darknessAt = (minuteOfDay: number): number => darknessAlphaForTime(
  minuteOfDay,
  TIME_BASED_LIGHTING_CONFIG.darknessKeyframes,
);

describe('time-based lighting', () => {
  it('keeps daytime brighter than evening and night', () => {
    expect(darknessAt(12 * 60)).toBeCloseTo(0.08);
    expect(darknessAt(19 * 60)).toBeCloseTo(0.43);
    expect(darknessAt(23 * 60)).toBeCloseTo(0.78);
  });

  it('changes smoothly through dawn and dusk', () => {
    const dawnStart = darknessAt(5 * 60);
    const dawnMiddle = darknessAt(6 * 60);
    const dawnEnd = darknessAt(7 * 60);
    const duskStart = darknessAt(17 * 60);
    const duskMiddle = darknessAt(19 * 60);
    const duskEnd = darknessAt(21 * 60);

    expect(dawnStart).toBeGreaterThan(dawnMiddle);
    expect(dawnMiddle).toBeGreaterThan(dawnEnd);
    expect(duskStart).toBeLessThan(duskMiddle);
    expect(duskMiddle).toBeLessThan(duskEnd);
  });

  it('wraps time across midnight and clamps invalid alpha values', () => {
    expect(darknessAt(24 * 60 + 60)).toBeCloseTo(darknessAt(60));
    expect(darknessAt(-60)).toBeCloseTo(darknessAt(23 * 60));
    expect(darknessAlphaForTime(0, [
      { minuteOfDay: 0, darknessAlpha: 2 },
    ])).toBe(1);
  });

  it('does not mutate lighting keyframes while resolving time', () => {
    const keyframes = [...TIME_BASED_LIGHTING_CONFIG.darknessKeyframes].reverse();
    const snapshot = structuredClone(keyframes);

    darknessAlphaForTime(12 * 60, keyframes);

    expect(keyframes).toEqual(snapshot);
  });

  it('turns the flashlight on and off with hysteresis', () => {
    expect(resolveFlashlightEnabled(false, 0.34, 0.35, 0.25)).toBe(false);
    expect(resolveFlashlightEnabled(false, 0.35, 0.35, 0.25)).toBe(true);
    expect(resolveFlashlightEnabled(true, 0.3, 0.35, 0.25)).toBe(true);
    expect(resolveFlashlightEnabled(true, 0.25, 0.35, 0.25)).toBe(false);
  });

  it('smoothly approaches visual lighting targets using deltaMs', () => {
    const first = dampValue(0, 1, 100, 3);
    const second = dampValue(first, 1, 100, 3);
    const whole = dampValue(0, 1, 200, 3);

    expect(first).toBeGreaterThan(0);
    expect(first).toBeLessThan(1);
    expect(second).toBeGreaterThan(first);
    expect(second).toBeCloseTo(whole);
  });

  it('does not advance visual smoothing for invalid deltas', () => {
    expect(dampValue(0.4, 1, 0, 3)).toBe(0.4);
    expect(dampValue(0.4, 1, -10, 3)).toBe(0.4);
    expect(dampValue(0.4, 1, Number.POSITIVE_INFINITY, 3)).toBe(0.4);
  });

  it('disables darkness when the renderer cannot provide light masks', () => {
    expect(renderableDarknessAlpha(0.78, false)).toBe(0);
    expect(renderableDarknessAlpha(0.78, true)).toBe(0.78);
  });

  it('decays transient muzzle light using deltaMs', () => {
    const first = decayTransientLight(1, 25, 28);
    const second = decayTransientLight(first, 25, 28);
    const whole = decayTransientLight(1, 50, 28);

    expect(first).toBeGreaterThan(0);
    expect(first).toBeLessThan(1);
    expect(second).toBeLessThan(first);
    expect(second).toBeCloseTo(whole);
  });
});
