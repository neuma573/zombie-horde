import { describe, expect, it } from 'vitest';

import { createHudLayout, createHudViewModel } from '../logic/hud';

describe('createHudViewModel', () => {
  it('projects all required playing state without mutating it', () => {
    const state = {
      health: 70,
      maxHealth: 100,
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

    expect(result.statusText).toBe('HP 70/100\nWAVE 3  LEFT 7\nKILLS 5');
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

describe('createHudLayout', () => {
  it('stacks status blocks inside portrait safe areas', () => {
    const layout = createHudLayout(360, 640, { top: 30, right: 0, bottom: 20, left: 0 });

    expect(layout.status).toEqual({ x: 114, y: 42 });
    expect(layout.ammo).toEqual({ x: 246, y: 56 });
    expect(layout.time).toEqual({ x: 180, y: 42, width: 116, height: 48 });
    expect(layout.gameOver.x).toBe(180);
    expect(layout.gameOver.y).toBe(325);
    expect(layout.reload.width).toBeGreaterThanOrEqual(150);
    expect(layout.reload.x).toBeGreaterThanOrEqual(12);
  });

  it('splits status blocks across a wide landscape safe area', () => {
    const layout = createHudLayout(960, 540, { top: 0, right: 24, bottom: 0, left: 24 });

    expect(layout.status).toEqual({ x: 414, y: 12 });
    expect(layout.ammo).toEqual({ x: 546, y: 26 });
    expect(layout.time).toEqual({ x: 480, y: 12, width: 116, height: 48 });
    expect(layout.gameOver).toEqual({ x: 480, y: 270 });
    expect(layout.reload.x).toBeCloseTo(329.04);
    expect(layout.reload.y).toBe(318);
    expect(layout.reload.width).toBeCloseTo(301.92);
    expect(layout.reload.height).toBe(10);
    expect(layout.waveBanner.x).toBe(480);
  });
});
