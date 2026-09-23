import { describe, expect, it } from 'vitest';
import { COMPANION_PISTOL } from '../../config/companionConfig';
import { PISTOL_WEAPON } from '../../config/weaponConfig';

describe('companion default weapon balance', () => {
  it('deals slightly less damage and fires far slower than the player pistol', () => {
    expect(COMPANION_PISTOL.config.damage).toBeLessThan(PISTOL_WEAPON.config.damage);
    expect(COMPANION_PISTOL.config.damage).toBeGreaterThan(PISTOL_WEAPON.config.damage / 2);
    expect(COMPANION_PISTOL.config.fireIntervalMs).toBeGreaterThan(PISTOL_WEAPON.config.fireIntervalMs * 5);
  });
});
