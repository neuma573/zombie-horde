import { describe, expect, it } from 'vitest';
import { DEFENSE_LIGHTING_CONFIG } from '../../config/lastStandCombatConfig';
import { TIME_BASED_LIGHTING_CONFIG } from '../../config/lightingConfig';
import { darknessAlphaForTime } from '../../logic/timeBasedLighting';

const darkness = (hour: number) => Math.min(DEFENSE_LIGHTING_CONFIG.maximumDarknessAlpha,
  darknessAlphaForTime(hour * 60, TIME_BASED_LIGHTING_CONFIG.darknessKeyframes));

describe('night defense lighting', () => {
  it('preserves the original darkness throughout night defense', () => {
    expect(darkness(23)).toBe(0.72);
    expect(darkness(0)).toBe(0.72);
    expect(darkness(3)).toBe(0.72);
    expect(darkness(4)).toBe(0.72);
    expect(darkness(5)).toBe(0.72);
  });
  it('preserves continuous darkness across midnight', () => {
    expect(darkness(24 - 1e-6)).toBeCloseTo(darkness(0));
    expect(darkness(1e-6)).toBeCloseTo(darkness(0));
  });
});
