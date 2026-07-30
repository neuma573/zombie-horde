import { describe, expect, it } from 'vitest';

import { PLAYER_CONFIG } from '../../config/playerConfig';
import { BASIC_WEAPON_CONFIG } from '../../config/weaponConfig';
import { WAVE_CONFIG } from '../../config/waveConfig';
import { ZOMBIE_CONFIG } from '../../config/zombieConfig';
import { resolveContactDamage } from '../../logic/contactDamage';
import { createSessionState, transitionToGameOver } from '../../logic/session';
import { createWaveState } from '../../logic/wave';
import { createWeaponState } from '../../logic/weapon';

describe('restart scenario', () => {
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
});
