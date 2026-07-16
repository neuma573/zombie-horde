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
      waveNumber: 3,
      wavePhase: 'waiting' as const,
      aliveZombieCount: 5,
      sessionPhase: 'playing' as const,
    };
    const snapshot = structuredClone(state);
    const result = createHudViewModel(state);

    expect(result.playerText).toContain('HP 70/100');
    expect(result.playerText).toContain('Ammo 4/36');
    expect(result.playerText).toContain('Reload In progress');
    expect(result.waveText).toContain('Wave 3');
    expect(result.waveText).toContain('Zombies 5');
    expect(result.waveText).toContain('Next wave incoming');
    expect(result.showGameOver).toBe(false);
    expect(state).toEqual(snapshot);
  });

  it('shows the restart message for game over', () => {
    const result = createHudViewModel({
      health: 0,
      maxHealth: 100,
      magazineAmmo: 12,
      reserveAmmo: 48,
      isReloading: false,
      waveNumber: 1,
      wavePhase: 'active',
      aliveZombieCount: 3,
      sessionPhase: 'gameOver',
    });

    expect(result.showGameOver).toBe(true);
    expect(result.gameOverText).toContain('Enter or tap to restart');
  });
});

describe('createHudLayout', () => {
  it('stacks status blocks inside portrait safe areas', () => {
    const layout = createHudLayout(360, 640, { top: 30, right: 0, bottom: 20, left: 0 });

    expect(layout.player).toEqual({ x: 12, y: 42 });
    expect(layout.wave).toEqual({ x: 12, y: 110, alignRight: false });
    expect(layout.gameOver.x).toBe(180);
    expect(layout.gameOver.y).toBe(325);
  });

  it('splits status blocks across a wide landscape safe area', () => {
    const layout = createHudLayout(960, 540, { top: 0, right: 24, bottom: 0, left: 24 });

    expect(layout.player).toEqual({ x: 36, y: 12 });
    expect(layout.wave).toEqual({ x: 924, y: 12, alignRight: true });
    expect(layout.gameOver).toEqual({ x: 480, y: 270 });
  });
});
