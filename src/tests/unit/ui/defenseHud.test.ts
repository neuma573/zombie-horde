import { describe, expect, it } from 'vitest';
import { createHudViewModel, type HudState } from '../../../logic/hud';

function state(overrides: Partial<HudState> = {}): HudState {
  return {
    health: 100, maxHealth: 100, stamina: 100, maxStamina: 100,
    magazineAmmo: 17, reserveAmmo: Infinity, shotSequence: 0, lastShotWeaponId: null,
    weaponId: 'pistol', magazineSize: 17, isReloading: false, reloadProgress: 0,
    waveNumber: 0, wavePhase: 'waiting', waveTimerMs: 0, remainingToSpawn: 0,
    aliveZombieCount: 0, killCount: 0, sessionPhase: 'playing', gameTimeText: '23:00',
    ...overrides,
  };
}

describe('defense HUD', () => {
  it('shows barricade integrity in the primary gauge instead of player health', () => {
    const hud = createHudViewModel(state({ health: 100, barricadeIntegrity: 37 }));
    expect(hud.healthRatio).toBeCloseTo(0.37);
    expect(hud.barricadeText).toBe('BARRICADE 37%');
  });
  it('keeps a breached barricade empty even while the player remains alive', () => {
    const hud = createHudViewModel(state({ health: 100, barricadeIntegrity: 0 }));
    expect(hud.healthRatio).toBe(0);
    expect(hud.barricadeText).toBe('BARRICADE 0%');
  });
  it('preserves the Horde health gauge without a barricade label', () => {
    const hud = createHudViewModel(state({ health: 55, reserveAmmo: 100 }));
    expect(hud.healthRatio).toBeCloseTo(0.55);
    expect(hud.barricadeText).toBeUndefined();
  });
});
