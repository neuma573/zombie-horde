import { describe, expect, it } from 'vitest';
import { HAZARD_DEFENSE_CONFIG } from '../../config/lastStandCombatConfig';
import { SIMULATION_CONFIG } from '../../config/simulationConfig';
import { PISTOL_WEAPON } from '../../config/weaponConfig';
import { ZOMBIE_CONFIG } from '../../config/zombieConfig';
import { createCompanion } from '../../logic/companion';
import { movePursuingZombie } from '../../logic/zombiePursuit';
import { CompanionCombat } from '../../systems/CompanionCombat';
import { LastStandCombat } from '../../systems/LastStandCombat';
import { WeaponSystem } from '../../systems/WeaponSystem';

describe('post-dawn combat', () => {
  it('keeps movement, companion fire and weapon timers running until the final kill', () => {
    const night = new LastStandCombat(HAZARD_DEFENSE_CONFIG, { 'hazard-main': 100 });
    night.start();
    night.registerZombie('last', 'mainEntrance');
    night.advanceTime(night.durationMs, true, 1);
    const weapon = new WeaponSystem(PISTOL_WEAPON, undefined, { unlimitedReserve: true });
    expect(weapon.fire()).toBe(true);
    expect(weapon.fire()).toBe(false);
    weapon.reload();
    expect(weapon.getState().reloadRemainingMs).toBeGreaterThan(0);
    const companions = new CompanionCombat([
      { companion: createCompanion('ally', 1, () => 0.99), weaponId: null },
    ], [{ x: 1200, y: 700 }], { x: 1400, y: 700 });
    let position = { x: 900, y: 700 };
    const player = { x: 1240, y: 700 };
    let shots = 0;

    for (let step = 0; step < 300; step++) {
      const dt = SIMULATION_CONFIG.fixedStepMs;
      position = movePursuingZombie({ id: 'last', kind: 'normal', position },
        night.getTarget('last', position, player), { x: 0, y: 0 }, dt, ZOMBIE_CONFIG);
      weapon.update(dt);
      shots += companions.advance(dt, 100, [
        { id: 'last', position, radius: 20, health: 1000 },
      ], []).length;
      night.advanceTime(dt, true, 1);
    }

    expect(position.x).toBeGreaterThan(900);
    expect(shots).toBeGreaterThan(0);
    expect(weapon.getState().reloadRemainingMs).toBeNull();
    expect(weapon.getState().magazineAmmo).toBe(PISTOL_WEAPON.config.magazineSize);
    expect(weapon.fire()).toBe(true);
    expect(night.getTime()).toEqual({ minuteOfDay: 5 * 60 });
    expect(night.getRemainingMs()).toBe(0);
    expect(night.canSpawnZombies()).toBe(false);
    expect(night.getPhase()).toBe('COMBAT');

    // The scene reports the final removal on the next simulation step.
    night.advanceTime(SIMULATION_CONFIG.fixedStepMs, true, 0);
    expect(night.getPhase()).toBe('VICTORY');
  });
});
