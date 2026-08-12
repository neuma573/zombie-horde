import { describe, expect, it } from 'vitest';

import { SHOTGUN_KNOCKBACK_CONFIG } from '../../../config/shotgunConfig';
import { shotgunKnockbackDistance } from '../../../logic/shotgunKnockback';

describe('shotgun knockback', () => {
  it('pushes a zombie farther when more pellets hit', () => {
    expect(shotgunKnockbackDistance(1, SHOTGUN_KNOCKBACK_CONFIG)).toBe(14);
    expect(shotgunKnockbackDistance(4, SHOTGUN_KNOCKBACK_CONFIG)).toBe(56);
  });

  it('caps a dense buckshot hit at the configured distance', () => {
    expect(shotgunKnockbackDistance(8, SHOTGUN_KNOCKBACK_CONFIG)).toBe(84);
  });

  it('ignores invalid pellet counts', () => {
    expect(shotgunKnockbackDistance(0, SHOTGUN_KNOCKBACK_CONFIG)).toBe(0);
    expect(shotgunKnockbackDistance(Number.NaN, SHOTGUN_KNOCKBACK_CONFIG)).toBe(0);
  });
});
