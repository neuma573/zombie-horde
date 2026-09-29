import { describe, expect, it } from 'vitest';
import { getCompanionVisualAlpha } from '../../../logic/companionVisual';
import { COMPANION_CONFIG } from '../../../config/companionConfig';

describe('companion visibility', () => {
  it('renders an active companion as opaque even near the exit', () => {
    expect(getCompanionVisualAlpha('active', 0)).toBe(1);
    expect(getCompanionVisualAlpha('active', 250)).toBe(1);
  });

  it('keeps a fleeing companion visible while still far from the exit', () => {
    // A survivor at x=1268 is still inside Hazard after the first second of flight.
    expect(getCompanionVisualAlpha('fleeing', 196)).toBe(1);
    expect(getCompanionVisualAlpha('fleeing', COMPANION_CONFIG.fleeFadeDistance)).toBe(1);
  });

  it('fades only during the final approach and disappears at the exit', () => {
    expect(getCompanionVisualAlpha('fleeing', COMPANION_CONFIG.fleeFadeDistance / 2)).toBeCloseTo(0.5);
    expect(getCompanionVisualAlpha('fleeing', 1)).toBeGreaterThan(0);
    expect(getCompanionVisualAlpha('fleeing', 0)).toBe(0);
  });

  it('keeps a companion that has left combat hidden', () => {
    expect(getCompanionVisualAlpha('left', 0)).toBe(0);
    expect(getCompanionVisualAlpha('left', 250)).toBe(0);
  });
});
