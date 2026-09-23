import { describe, expect, it } from 'vitest';
import { HAZARD_DEFENSE_CONFIG, LAST_STAND_COMBAT_CONFIG } from '../../config/lastStandCombatConfig';
import { ZOMBIE_CONFIG } from '../../config/zombieConfig';
import { LastStandCombat } from '../../systems/LastStandCombat';
import { movePursuingZombie } from '../../logic/zombiePursuit';

describe('breached defense pursuit', () => {
  it('slows normal and fast zombies equally only after their barricade collapses', () => {
    const intact = new LastStandCombat(HAZARD_DEFENSE_CONFIG, { 'hazard-main': 1 });
    const breached = new LastStandCombat(HAZARD_DEFENSE_CONFIG, { 'hazard-main': 0 });
    intact.registerZombie('z', 'mainEntrance'); breached.registerZombie('z', 'mainEntrance');
    const move = (night: LastStandCombat, kind: 'normal' | 'fast') => movePursuingZombie(
      { id: 'z', kind, position: { x: 0, y: 0 } }, { x: 1000, y: 0 }, { x: 0, y: 0 }, 1000,
      ZOMBIE_CONFIG, night.getPursuitSpeed('z'));
    expect(move(intact, 'fast').x).toBeGreaterThan(move(intact, 'normal').x);
    expect(move(breached, 'fast')).toEqual(move(breached, 'normal'));
    expect(move(breached, 'fast').x).toBe(LAST_STAND_COMBAT_CONFIG.breachedPursuitSpeed);
    expect(move(breached, 'fast').x).toBeLessThan(move(intact, 'normal').x);
  });
  it('preserves the slow approach distance across time partitions', () => {
    const pursue = (steps: number[]) => {
      let position = { x: 0, y: 0 };
      for (const dt of steps) position = movePursuingZombie({ id: 'z', kind: 'fast', position },
        { x: 1000, y: 0 }, { x: 0, y: 0 }, dt, ZOMBIE_CONFIG, LAST_STAND_COMBAT_CONFIG.breachedPursuitSpeed);
      return position;
    };
    expect(pursue([1000]).x).toBeCloseTo(pursue(Array(60).fill(1000 / 60)).x);
  });
});
