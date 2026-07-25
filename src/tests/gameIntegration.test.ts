import { describe, expect, it } from 'vitest';

import { PLAYER_CONFIG } from '../config/playerConfig';
import { SPAWN_CONFIG } from '../config/spawnConfig';
import { BASIC_WEAPON_CONFIG } from '../config/weaponConfig';
import { WAVE_CONFIG } from '../config/waveConfig';
import { ZOMBIE_CONFIG } from '../config/zombieConfig';
import { resolveContactDamage } from '../logic/contactDamage';
import { applyDamage } from '../logic/damage';
import { resolveAimDirection } from '../logic/aim';
import { resolveHitscan } from '../logic/hitscan';
import { createHudLayout } from '../logic/hud';
import { constrainToBounds, moveWithinBounds } from '../logic/movement';
import { createSessionState, transitionToGameOver } from '../logic/session';
import { getEdgeSpawnPosition } from '../logic/spawn';
import { advanceWave, createWaveState } from '../logic/wave';
import {
  advanceWeapon,
  createWeaponState,
  startReload,
  tryFire,
} from '../logic/weapon';

describe('game integration', () => {
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

  it('creates clean session, weapon, and wave state after game over', () => {
    const lethalDamage = resolveContactDamage(
      {
        health: 10,
        isAlive: true,
        invulnerabilityRemainingMs: 0,
        invulnerabilityMs: PLAYER_CONFIG.invulnerabilityMs,
      },
      [{
        damage: ZOMBIE_CONFIG.contactDamage,
        attackIntervalMs: ZOMBIE_CONFIG.attackIntervalMs,
        cooldownRemainingMs: 0,
        windupMs: ZOMBIE_CONFIG.attackWindupMs,
        contactWindow: { startMs: 0, endMs: ZOMBIE_CONFIG.attackWindupMs },
      }],
      ZOMBIE_CONFIG.attackWindupMs,
    );
    const gameOver = lethalDamage.died
      ? transitionToGameOver(createSessionState()).state
      : createSessionState();
    const restartedSession = createSessionState();
    const restartedWeapon = createWeaponState(BASIC_WEAPON_CONFIG);
    const restartedWave = createWaveState(WAVE_CONFIG);

    expect(gameOver.phase).toBe('gameOver');
    expect(lethalDamage.health).toBe(0);
    expect(restartedSession).toEqual({ phase: 'playing' });
    expect(restartedWeapon).toEqual({
      magazineAmmo: BASIC_WEAPON_CONFIG.magazineSize,
      reserveAmmo: BASIC_WEAPON_CONFIG.reserveAmmo,
      cooldownRemainingMs: 0,
      reloadRemainingMs: null,
    });
    expect(restartedWave).toEqual({
      phase: 'waiting',
      waveNumber: 0,
      remainingToSpawn: 0,
      timerMs: WAVE_CONFIG.initialDelayMs,
    });
  });

  it('keeps gameplay coordinates and HUD inside resized portrait and landscape areas', () => {
    const portrait = { width: 360, height: 640 };
    const player = constrainToBounds(
      { x: 900, y: 500 },
      { ...portrait, padding: PLAYER_CONFIG.radius },
    );
    const zombie = getEdgeSpawnPosition(
      0,
      portrait,
      ZOMBIE_CONFIG.radius,
      player,
      SPAWN_CONFIG.minimumZombieDistanceFromPlayer,
    );
    const aim = resolveAimDirection(
      { x: zombie.x - player.x, y: zombie.y - player.y },
      { x: 1, y: 0 },
    );
    const shot = resolveHitscan(
      player,
      aim,
      BASIC_WEAPON_CONFIG.range,
      [{ id: 'zombie', position: zombie, radius: ZOMBIE_CONFIG.radius }],
      1,
    );
    const portraitHud = createHudLayout(360, 640, { top: 30, right: 0, bottom: 20, left: 0 });
    const landscapeHud = createHudLayout(960, 540, { top: 0, right: 24, bottom: 0, left: 24 });

    expect(player.x).toBeLessThanOrEqual(portrait.width - PLAYER_CONFIG.radius);
    expect(shot.hits[0]?.targetId).toBe('zombie');
    expect(portraitHud.status.x).toBeGreaterThanOrEqual(0);
    expect(portraitHud.ammo.y).toBeLessThan(portrait.height);
    expect(landscapeHud.ammo.x).toBeLessThan(960);
    expect(landscapeHud.gameOver.y).toBeLessThan(540);
  });
});
