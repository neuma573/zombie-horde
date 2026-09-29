import { describe, expect, it } from 'vitest';
import { HAZARD_DEFENSE_CONFIG, LAST_STAND_COMBAT_CONFIG } from '../../config/lastStandCombatConfig';
import { ZOMBIE_CONFIG } from '../../config/zombieConfig';
import { LastStandCombat } from '../../systems/LastStandCombat';
import { resolveZombieCrowdSpacing } from '../../logic/zombieCrowdSpacing';
import { queryZombieCollisionCandidates } from '../../logic/zombieSpatialGrid';
import { ZOMBIE_CROWD_SPACING_CONFIG } from '../../config/zombieCrowdSpacingConfig';
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
  it.each(['normal', 'fast'] as const)('keeps a crowded %s zombie advancing immediately after collapse', kind => {
    const night = new LastStandCombat(HAZARD_DEFENSE_CONFIG, { 'hazard-main': LAST_STAND_COMBAT_CONFIG.barricadeDamage });
    night.start();
    night.registerZombie('z', 'mainEntrance');
    const position = { x: 1048, y: 700 };
    const player = { x: 1240, y: 700 };
    const entries = [
      { id: 'z', position, radius: 20 },
      { id: 'front-a', position: { x: 1049, y: 700 }, radius: 20 },
      { id: 'front-b', position: { x: 1050, y: 700 }, radius: 20 },
    ];
    const crowd = resolveZombieCrowdSpacing(entries, queryZombieCollisionCandidates(entries),
      ZOMBIE_CROWD_SPACING_CONFIG, ZOMBIE_CONFIG.speed);
    expect(crowd.valid).toBe(true);
    const separation = crowd.velocities.get('z')!;
    expect(separation).toEqual({ x: -36, y: 0 });
    night.resolveContacts({ start: player, end: player, radius: 20 }, [
      { id: 'z', start: position, end: position, radius: 20 },
    ], LAST_STAND_COMBAT_CONFIG.attackWindupMs);
    expect(night.getSectors()[0].integrity).toBe(0);

    const next = movePursuingZombie({ id: 'z', kind, position }, night.getTarget('z', position, player),
      separation, 1000, ZOMBIE_CONFIG, night.getPursuitSpeed('z'));
    expect(next.x - position.x).toBeCloseTo(24.32);
    expect(next.y).toBe(position.y);
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
