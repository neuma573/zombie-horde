import { describe, expect, it } from 'vitest';

import { MVP_CONFIG } from '../config/mvpConfig';
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

describe('MVP integration', () => {
  it('completes ten deterministic waves with movement, aim, hitscan, damage, and reload', () => {
    let wave = createWaveState(MVP_CONFIG.wave);
    let weapon = createWeaponState(MVP_CONFIG.weapon);
    let playerPosition = { x: 400, y: 300 };
    let completedWaves = 0;
    let totalShots = 0;
    let updateCount = 0;
    let spawnedThisWave = 0;

    while (completedWaves < 10 && updateCount < 1_000) {
      const waveUpdate = advanceWave(wave, MVP_CONFIG.wave, 500, 0);
      wave = waveUpdate.state;
      spawnedThisWave += waveUpdate.spawnCount;
      updateCount += 1;

      if (wave.phase !== 'active') {
        continue;
      }

      playerPosition = moveWithinBounds(
        playerPosition,
        { x: 1, y: completedWaves % 2 === 0 ? 1 : -1 },
        MVP_CONFIG.player.speed,
        50,
        { width: 800, height: 600, padding: MVP_CONFIG.player.radius },
      );
      const zombieCount = MVP_CONFIG.wave.baseZombieCount
        + completedWaves * MVP_CONFIG.wave.zombiesPerWave;
      expect(spawnedThisWave).toBe(zombieCount);

      for (let zombieIndex = 0; zombieIndex < zombieCount; zombieIndex += 1) {
        let zombieHealth: number = MVP_CONFIG.zombie.health;

        while (zombieHealth > 0) {
          let fire = tryFire(weapon, MVP_CONFIG.weapon);

          if (!fire.fired) {
            weapon = advanceWeapon(
              startReload(weapon, MVP_CONFIG.weapon),
              MVP_CONFIG.weapon,
              MVP_CONFIG.weapon.reloadDurationMs,
            );
            fire = tryFire(weapon, MVP_CONFIG.weapon);
          }

          expect(fire.fired).toBe(true);
          weapon = advanceWeapon(
            fire.state,
            MVP_CONFIG.weapon,
            MVP_CONFIG.weapon.fireIntervalMs,
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
            MVP_CONFIG.weapon.range,
            [{ id: 'zombie', position: zombiePosition, radius: MVP_CONFIG.zombie.radius }],
            MVP_CONFIG.weapon.maxTargets,
          );

          expect(shot.hits).toHaveLength(1);
          zombieHealth = applyDamage(zombieHealth, MVP_CONFIG.weapon.damage).health;
        }
      }

      completedWaves += 1;
      spawnedThisWave = 0;
    }

    expect(completedWaves).toBe(10);
    expect(wave.waveNumber).toBe(10);
    expect(totalShots).toBe(240);
    expect(weapon.reserveAmmo).toBeGreaterThan(0);
  });

  it('creates clean session, weapon, and wave state after game over', () => {
    const lethalDamage = resolveContactDamage(
      {
        health: 10,
        isAlive: true,
        invulnerabilityRemainingMs: 0,
        invulnerabilityMs: MVP_CONFIG.player.invulnerabilityMs,
      },
      [{
        damage: MVP_CONFIG.zombie.contactDamage,
        attackIntervalMs: MVP_CONFIG.zombie.attackIntervalMs,
        cooldownRemainingMs: 0,
        windupMs: MVP_CONFIG.zombie.attackWindupMs,
        contactWindow: { startMs: 0, endMs: MVP_CONFIG.zombie.attackWindupMs },
      }],
      MVP_CONFIG.zombie.attackWindupMs,
    );
    const gameOver = lethalDamage.died
      ? transitionToGameOver(createSessionState()).state
      : createSessionState();
    const restartedSession = createSessionState();
    const restartedWeapon = createWeaponState(MVP_CONFIG.weapon);
    const restartedWave = createWaveState(MVP_CONFIG.wave);

    expect(gameOver.phase).toBe('gameOver');
    expect(lethalDamage.health).toBe(0);
    expect(restartedSession).toEqual({ phase: 'playing' });
    expect(restartedWeapon).toEqual({
      magazineAmmo: MVP_CONFIG.weapon.magazineSize,
      reserveAmmo: MVP_CONFIG.weapon.reserveAmmo,
      cooldownRemainingMs: 0,
      reloadRemainingMs: null,
    });
    expect(restartedWave).toEqual({
      phase: 'waiting',
      waveNumber: 0,
      remainingToSpawn: 0,
      timerMs: MVP_CONFIG.wave.initialDelayMs,
    });
  });

  it('keeps gameplay coordinates and HUD inside resized portrait and landscape areas', () => {
    const portrait = { width: 360, height: 640 };
    const player = constrainToBounds(
      { x: 900, y: 500 },
      { ...portrait, padding: MVP_CONFIG.player.radius },
    );
    const zombie = getEdgeSpawnPosition(
      0,
      portrait,
      MVP_CONFIG.zombie.radius,
      player,
      MVP_CONFIG.spawn.minPlayerDistance,
    );
    const aim = resolveAimDirection(
      { x: zombie.x - player.x, y: zombie.y - player.y },
      { x: 1, y: 0 },
    );
    const shot = resolveHitscan(
      player,
      aim,
      MVP_CONFIG.weapon.range,
      [{ id: 'zombie', position: zombie, radius: MVP_CONFIG.zombie.radius }],
      1,
    );
    const portraitHud = createHudLayout(360, 640, { top: 30, right: 0, bottom: 20, left: 0 });
    const landscapeHud = createHudLayout(960, 540, { top: 0, right: 24, bottom: 0, left: 24 });

    expect(player.x).toBeLessThanOrEqual(portrait.width - MVP_CONFIG.player.radius);
    expect(shot.hits[0]?.targetId).toBe('zombie');
    expect(portraitHud.player.x).toBeGreaterThanOrEqual(0);
    expect(portraitHud.wave.y).toBeLessThan(portrait.height);
    expect(landscapeHud.wave.x).toBeLessThan(960);
    expect(landscapeHud.gameOver.y).toBeLessThan(540);
  });
});
