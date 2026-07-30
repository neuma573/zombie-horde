import { describe, expect, it } from 'vitest';

import { PLAYER_CONFIG } from '../../config/playerConfig';
import { BASIC_WEAPON_CONFIG } from '../../config/weaponConfig';
import { WAVE_CONFIG } from '../../config/waveConfig';
import { ZOMBIE_CONFIG } from '../../config/zombieConfig';
import { applyDamage } from '../../logic/damage';
import { resolveAimDirection } from '../../logic/aim';
import { resolveHitscan } from '../../logic/hitscan';
import { moveWithinBounds } from '../../logic/movement';
import { advanceWave, createWaveState } from '../../logic/wave';
import { advanceWeapon, createWeaponState, startReload, tryFire } from '../../logic/weapon';

describe('wave combat scenario', () => {
  it('completes ten deterministic waves with sufficient ammunition', () => {
  const expectedZombieCount = Array.from({ length: 10 }, (_, index) => (
    WAVE_CONFIG.baseZombieCount + index * WAVE_CONFIG.zombiesPerWave
  )).reduce((total, count) => total + count, 0);
  const shotsPerZombie = Math.ceil(
    ZOMBIE_CONFIG.health / BASIC_WEAPON_CONFIG.damage,
  );
  const requiredShots = expectedZombieCount * shotsPerZombie;
  let wave = createWaveState(WAVE_CONFIG);
  let weapon = createWeaponState({
    ...BASIC_WEAPON_CONFIG,
    reserveAmmo: requiredShots,
  });
  let playerPosition = { x: 400, y: 300 };
  let completedWaves = 0;
  let totalShots = 0;
  let updateCount = 0;
  let spawnedThisWave = 0;

  while (completedWaves < 10 && updateCount < 1_000) {
    const waveUpdate = advanceWave(wave, WAVE_CONFIG, 500, 0);
    wave = waveUpdate.state;
    spawnedThisWave += waveUpdate.spawnCount;
    updateCount += 1;

    if (wave.phase !== 'active') {
      continue;
    }

    playerPosition = moveWithinBounds(
      playerPosition,
      { x: 1, y: completedWaves % 2 === 0 ? 1 : -1 },
      PLAYER_CONFIG.speed,
      50,
      { width: 800, height: 600, padding: PLAYER_CONFIG.radius },
    );
    const zombieCount = WAVE_CONFIG.baseZombieCount
      + completedWaves * WAVE_CONFIG.zombiesPerWave;
    expect(spawnedThisWave).toBe(zombieCount);

    for (let zombieIndex = 0; zombieIndex < zombieCount; zombieIndex += 1) {
      let zombieHealth: number = ZOMBIE_CONFIG.health;

      while (zombieHealth > 0) {
        let fire = tryFire(weapon, BASIC_WEAPON_CONFIG);

        if (!fire.fired) {
          weapon = advanceWeapon(
            startReload(weapon, BASIC_WEAPON_CONFIG),
            BASIC_WEAPON_CONFIG,
            BASIC_WEAPON_CONFIG.reloadDurationMs,
          );
          fire = tryFire(weapon, BASIC_WEAPON_CONFIG);
        }

        expect(fire.fired).toBe(true);
        weapon = advanceWeapon(
          fire.state,
          BASIC_WEAPON_CONFIG,
          BASIC_WEAPON_CONFIG.fireIntervalMs,
        );
        totalShots += 1;

        const zombiePosition = { x: playerPosition.x + 100, y: playerPosition.y };
        const aim = resolveAimDirection(
          { x: zombiePosition.x - playerPosition.x, y: zombiePosition.y - playerPosition.y },
          { x: 1, y: 0 },
        );
        const shot = resolveHitscan(
          playerPosition,
          aim,
          BASIC_WEAPON_CONFIG.range,
          [{ id: 'zombie', position: zombiePosition, radius: ZOMBIE_CONFIG.radius }],
          BASIC_WEAPON_CONFIG.maxTargets,
        );

        expect(shot.hits).toHaveLength(1);
        zombieHealth = applyDamage(zombieHealth, BASIC_WEAPON_CONFIG.damage).health;
      }
    }

    completedWaves += 1;
    spawnedThisWave = 0;
  }

  expect(completedWaves).toBe(10);
  expect(wave.waveNumber).toBe(10);
  expect(totalShots).toBe(expectedZombieCount * shotsPerZombie);
  expect(weapon.reserveAmmo).toBeLessThan(requiredShots);
    });
});
