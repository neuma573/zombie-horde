import { describe, expect, it } from 'vitest';

import { advanceWeaponPickupLifetime } from '../../../logic/weapon';

describe('weapon pickup lifetime', () => {
  it('expires a field weapon after thirty seconds of simulation time', () => {
    const halfway = advanceWeaponPickupLifetime(30_000, 15_000);

    expect(halfway).toBe(15_000);
    expect(advanceWeaponPickupLifetime(halfway, 14_999)).toBe(1);
    expect(advanceWeaponPickupLifetime(1, 1)).toBe(0);
  });
});
