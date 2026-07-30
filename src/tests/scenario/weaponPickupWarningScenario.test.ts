import { describe, expect, it } from 'vitest';

import { weaponPickupWarningAlpha } from '../../effects/weaponPickupWarning';
import { advanceWeaponPickupLifetime } from '../../logic/weapon';

describe('weapon pickup warning scenario', () => {
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
