import { describe, expect, it } from 'vitest';

import { BASIC_WEAPON_CONFIG } from '../../config/weaponConfig';
import { WAVE_CONFIG } from '../../config/waveConfig';
import { ZOMBIE_CONFIG } from '../../config/zombieConfig';

describe('ammunition balance', () => {
  it('keeps the production ammunition limit separate from wave progression', () => {
    const availableShots = BASIC_WEAPON_CONFIG.magazineSize
      + BASIC_WEAPON_CONFIG.reserveAmmo;
    const zombiesInTenWaves = Array.from({ length: 10 }, (_, index) => (
      WAVE_CONFIG.baseZombieCount + index * WAVE_CONFIG.zombiesPerWave
    )).reduce((total, count) => total + count, 0);
    const requiredShots = zombiesInTenWaves * Math.ceil(
      ZOMBIE_CONFIG.health / BASIC_WEAPON_CONFIG.damage,
    );

    expect(availableShots).toBeLessThan(requiredShots);
  });
});
