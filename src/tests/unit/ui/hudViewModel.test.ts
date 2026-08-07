import { describe, expect, it } from 'vitest';
import { createHudViewModel } from '../../../logic/hud';

describe('createHudViewModel', () => {
  it('projects all required playing state without mutating it', () => {
    const state = {
      health: 70,
      maxHealth: 100,
      stamina: 65,
      maxStamina: 100,
      magazineAmmo: 4,
      reserveAmmo: 36,
      isReloading: true,
      reloadProgress: 0.5,
      waveNumber: 3,
      wavePhase: 'spawning' as const,
      waveTimerMs: 0,
      remainingToSpawn: 3,
      aliveZombieCount: 4,
      killCount: 5,
      sessionPhase: 'playing' as const,
      gameTimeText: '08:30',
    };
    const snapshot = structuredClone(state);
    const result = createHudViewModel(state);

    expect(result.statusText).toBe('HP 70/100\nST 65/100\nWAVE 3  LEFT 7\nKILLS 5');
    expect(result.ammoText).toBe('4 / 36');
    expect(result.ammoText).not.toContain('AMMO');
    expect(result.timeText).toBe('08:30');
    expect(result.showGameOver).toBe(false);
    expect(result.waveBannerText).toBeNull();
    expect(result.reloadProgress).toBe(0.5);
    expect(result.reloadPrompt).toBeNull();
    expect(state).toEqual(snapshot);
  });

  it('shows the restart message for game over', () => {
    const result = createHudViewModel({
      health: 0,
      maxHealth: 100,
      stamina: 0,
      maxStamina: 100,
      magazineAmmo: 12,
      reserveAmmo: 48,
      isReloading: false,
      reloadProgress: 0,
      waveNumber: 1,
      wavePhase: 'active',
      waveTimerMs: 0,
      remainingToSpawn: 0,
      aliveZombieCount: 0,
      killCount: 0,
      sessionPhase: 'gameOver',
      gameTimeText: '11:40',
    });

    expect(result.showGameOver).toBe(true);
    expect(result.reloadProgress).toBeNull();
    expect(result.reloadPrompt).toBeNull();
    expect(result.gameOverText).toContain('Enter or tap to restart');
  });

  it('prompts for reload only when the empty weapon can reload', () => {
    const base = {
      health: 100,
      maxHealth: 100,
      stamina: 100,
      maxStamina: 100,
      magazineAmmo: 0,
      reserveAmmo: 12,
      isReloading: false,
      reloadProgress: 0,
      waveNumber: 1,
      wavePhase: 'active' as const,
      waveTimerMs: 0,
      remainingToSpawn: 0,
      aliveZombieCount: 1,
      killCount: 0,
      sessionPhase: 'playing' as const,
      gameTimeText: '08:00',
    };

    expect(createHudViewModel(base).reloadPrompt).toBe('RELOAD');
    expect(createHudViewModel({ ...base, magazineAmmo: 1 }).reloadPrompt).toBeNull();
    expect(createHudViewModel({ ...base, reserveAmmo: 0 }).reloadPrompt).toBeNull();
    expect(createHudViewModel({ ...base, isReloading: true }).reloadPrompt).toBeNull();
  });

  it('shows preparation and cleared-wave countdowns during intermissions', () => {
    const base = {
      health: 100,
      maxHealth: 100,
      stamina: 100,
      maxStamina: 100,
      magazineAmmo: 12,
      reserveAmmo: 48,
      isReloading: false,
      reloadProgress: 0,
      waveNumber: 0,
      wavePhase: 'waiting' as const,
      waveTimerMs: 1_001,
      remainingToSpawn: 0,
      aliveZombieCount: 0,
      killCount: 0,
      sessionPhase: 'playing' as const,
      gameTimeText: '08:00',
    };

    expect(createHudViewModel(base).waveBannerText).toBe('PREPARE\nWAVE 1 IN 2');
    expect(createHudViewModel({
      ...base,
      waveNumber: 3,
      waveTimerMs: 999,
    }).waveBannerText).toBe('WAVE 3 CLEAR\nNEXT WAVE IN 1');
  });
});
