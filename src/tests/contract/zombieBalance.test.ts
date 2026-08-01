import { describe, expect, it } from 'vitest';

import { ZOMBIE_CONFIG } from '../../config/zombieConfig';

describe('zombie balance', () => {
  it('uses the exact 1.25 speed multiplier without changing attack balance', () => {
    expect(ZOMBIE_CONFIG.speed).toBe(80 * 1.25);
    expect(ZOMBIE_CONFIG.contactDamage).toBe(10);
    expect(ZOMBIE_CONFIG.attackIntervalMs).toBe(800);
  });

  it('runs fast zombies at no less than twice normal speed', () => {
    expect(ZOMBIE_CONFIG.fast.minimumSpeedMultiplier).toBeGreaterThanOrEqual(2);
    expect(ZOMBIE_CONFIG.fast.maximumSpeedMultiplier)
      .toBeGreaterThanOrEqual(ZOMBIE_CONFIG.fast.minimumSpeedMultiplier);
  });
});
