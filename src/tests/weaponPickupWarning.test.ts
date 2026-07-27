import { describe, expect, it } from 'vitest';

import {
  weaponPickupWarningAlpha,
  weaponPickupWarningPulseRateHz,
  WEAPON_PICKUP_WARNING_DURATION_MS,
  WEAPON_PICKUP_WARNING_END_HZ,
  WEAPON_PICKUP_WARNING_START_HZ,
} from '../effects/weaponPickupWarning';
import { advanceWeaponPickupLifetime } from '../logic/weapon';

describe('weapon pickup expiration warning', () => {
  it('stays fully visible before the final five seconds', () => {
    expect(weaponPickupWarningAlpha(
      WEAPON_PICKUP_WARNING_DURATION_MS + 1,
    )).toBe(1);
  });

  it('starts fully visible and keeps pulse opacity within readable bounds', () => {
    expect(weaponPickupWarningAlpha(5_000)).toBeCloseTo(1);
    for (let remaining = 5_000; remaining >= 0; remaining -= 25) {
      expect(weaponPickupWarningAlpha(remaining)).toBeGreaterThanOrEqual(0.35);
      expect(weaponPickupWarningAlpha(remaining)).toBeLessThanOrEqual(1);
    }
  });

  it('accelerates continuously as expiration approaches', () => {
    expect(weaponPickupWarningPulseRateHz(5_000)).toBe(
      WEAPON_PICKUP_WARNING_START_HZ,
    );
    expect(weaponPickupWarningPulseRateHz(2_500)).toBeCloseTo(3.75);
    expect(weaponPickupWarningPulseRateHz(0)).toBe(
      WEAPON_PICKUP_WARNING_END_HZ,
    );
  });

  it('produces the same warning phase regardless of update chunking', () => {
    const singleUpdate = advanceWeaponPickupLifetime(5_000, 2_625);
    const splitUpdate = advanceWeaponPickupLifetime(
      advanceWeaponPickupLifetime(5_000, 1_000),
      1_625,
    );

    expect(singleUpdate).toBe(splitUpdate);
    expect(weaponPickupWarningAlpha(singleUpdate)).toBeCloseTo(
      weaponPickupWarningAlpha(splitUpdate),
    );
  });
});
