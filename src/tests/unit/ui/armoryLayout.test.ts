import { describe, expect, it } from 'vitest';
import { getArmoryUiScale } from '../../../logic/armoryLayout';

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
