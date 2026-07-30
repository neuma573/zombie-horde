import { describe, expect, it } from 'vitest';

import { EMERGENCY_SUPPLY_FALL_DURATION_MS, NORMAL_SUPPLY_FALL_DURATION_MS, SUPPLY_DROP_BALANCE, SUPPLY_DROP_CONFIG } from '../../config/supplyDropConfig';

describe('supply drop balance', () => {
  it('slows the plane by half and derives fall durations from shared multipliers', () => {
    expect(SUPPLY_DROP_BALANCE.planeSpeedMultiplier).toBe(0.5);
    expect(SUPPLY_DROP_CONFIG.flyoverDurationMs).toBe(5_600);
    expect(NORMAL_SUPPLY_FALL_DURATION_MS).toBe(3_300);
    expect(EMERGENCY_SUPPLY_FALL_DURATION_MS).toBe(
      NORMAL_SUPPLY_FALL_DURATION_MS * 2,
    );
  });
});
