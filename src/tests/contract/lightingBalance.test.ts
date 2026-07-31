import { describe, expect, it } from 'vitest';

import { TIME_BASED_LIGHTING_CONFIG } from '../../config/lightingConfig';
import { darknessAlphaForTime } from '../../logic/timeBasedLighting';

describe('night visibility balance', () => {
  it('keeps unlit nighttime space nearly black', () => {
    const midnightDarkness = darknessAlphaForTime(
      0,
      TIME_BASED_LIGHTING_CONFIG.darknessKeyframes,
    );
    const middayDarkness = darknessAlphaForTime(
      12 * 60,
      TIME_BASED_LIGHTING_CONFIG.darknessKeyframes,
    );

    expect(midnightDarkness).toBeGreaterThanOrEqual(0.95);
    expect(middayDarkness).toBeLessThanOrEqual(0.1);
    expect(TIME_BASED_LIGHTING_CONFIG.ambientLightRadius).toBeLessThanOrEqual(72);
    expect(TIME_BASED_LIGHTING_CONFIG.flashlightLength).toBeGreaterThan(
      TIME_BASED_LIGHTING_CONFIG.ambientLightRadius * 6,
    );
  });
});
