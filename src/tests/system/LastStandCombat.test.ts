import { GAME_TIME_CONFIG } from '../../config/gameTimeConfig';
import { describe, expect, it } from 'vitest';
import { HAZARD_DEFENSE_CONFIG, LAST_STAND_COMBAT_CONFIG as RULES } from '../../config/lastStandCombatConfig';
import { LastStandCombat, type CombatMotion, type DefenseZombieMotion } from '../../systems/LastStandCombat';
import { advanceGameTime, createGameTimeState, formatGameTime } from '../../logic/gameTime';
import type { CityDefenseConfig } from '../../types/lastStandCombat';

const player: CombatMotion = { start: { x: 1240, y: 700 }, end: { x: 1240, y: 700 }, radius: 20 };
function motion(x = 1048, y = 700, id = 'z1'): DefenseZombieMotion {
  return { id, start: { x, y }, end: { x, y }, radius: 20 };
}
function combat(integrity = 80) {
  const system = new LastStandCombat(HAZARD_DEFENSE_CONFIG, { 'hazard-main': integrity });
  system.start();
  system.registerZombie('z1', 'mainEntrance');
  return system;
}

describe('LastStandCombat', () => {
  it('preserves daytime repairs and starts the existing clock at 23:00', () => {
    const system = new LastStandCombat(HAZARD_DEFENSE_CONFIG, { 'hazard-main': 80 });
    expect(system.getPhase()).toBe('PREPARING');
    system.start();
    expect(system.getPhase()).toBe('COMBAT');
    expect(formatGameTime(system.getTime())).toBe('23:00');
    expect(system.getSectors()[0].integrity).toBe(80);
  });
  it('runs the night clock twice as fast as Horde without changing Horde time', () => {
    const system = combat();
    const hordeTime = advanceGameTime(createGameTimeState(GAME_TIME_CONFIG), 30000, GAME_TIME_CONFIG);
    system.advanceTime(30000, true);
    expect(hordeTime.minuteOfDay - GAME_TIME_CONFIG.startMinuteOfDay).toBe(30);
    expect(formatGameTime(system.getTime())).toBe('00:00');
    expect(system.durationMs).toBe(180000);
  });
  it('rejects missing daytime integrity instead of resetting a barricade', () => {
    expect(() => new LastStandCombat(HAZARD_DEFENSE_CONFIG, {})).toThrow('Missing integrity');
  });
  it('targets the assigned barricade even when the player is closer', () => {
    const system = combat();
    expect(system.getTarget('z1', { x: 800, y: 700 }, { x: 801, y: 700 })).toEqual({ x: 1068, y: 700 });
  });
  it('consumes exactly one percentage point after each completed attack windup', () => {
    const system = combat();
    system.resolveContacts(player, [motion()], RULES.attackWindupMs - 1);
    expect(system.getSectors()[0].integrity).toBe(80);
    system.resolveContacts(player, [motion()], 1);
    expect(system.getSectors()[0].integrity).toBe(79);
  });
  it('does not damage a barricade from outside attack reach', () => {
    const system = combat();
    system.resolveContacts(player, [motion(1000)], 10_000);
    expect(system.getSectors()[0].integrity).toBe(80);
  });
  it('applies the same stationary attacks for different frame partitions', () => {
    const one = combat(100);
    const split = combat(100);
    one.resolveContacts(player, [motion()], 2000);
    for (let i = 0; i < 120; i++) split.resolveContacts(player, [motion()], 2000 / 120);
    expect(split.getSectors()[0].integrity).toBe(one.getSectors()[0].integrity);
    expect(split.getAttackState('z1').cooldownRemainingMs).toBeCloseTo(one.getAttackState('z1').cooldownRemainingMs);
  });
  it('removes only the destroyed barricade from movement obstacles', () => {
    const second = { ...HAZARD_DEFENSE_CONFIG.sectors[0], id: 'east', barricadeId: 'east-wall' };
    const layout: CityDefenseConfig = { ...HAZARD_DEFENSE_CONFIG, sectors: [...HAZARD_DEFENSE_CONFIG.sectors, second] };
    const system = new LastStandCombat(layout, { 'hazard-main': 0.15, 'east-wall': 65 });
    system.start();
    system.registerZombie('z1', 'mainEntrance');
    system.resolveContacts(player, [motion()], RULES.attackWindupMs);
    expect(system.getSectors().map(s => [s.integrity, s.phase])).toEqual([[0, 'BREACHED'], [65, 'ACTIVE']]);
    expect(system.getMovementObstacles()).toHaveLength(layout.walls.length + (layout.fixtures?.length ?? 0) + 1);
    expect(system.getPhase()).toBe('COMBAT');
  });
  it('requires entry through the breached sector before lethal player contact', () => {
    const system = combat(0);
    expect(system.resolveContacts(player, [motion(1240)], 16)).toBe(false);
    expect(system.getTarget('z1', { x: 1048, y: 700 }, player.end)).toEqual({ x: 1140, y: 700 });
    expect(system.resolveContacts(player, [motion(1140)], 16)).toBe(false);
    expect(system.getTarget('z1', { x: 1140, y: 700 }, player.end)).toEqual(player.end);
    expect(system.resolveContacts(player, [motion(1200)], 16)).toBe(true);
    expect(system.getPhase()).toBe('DEFEAT');
  });
  it('routes newly spawned zombies through an already breached entrance', () => {
    const system = combat(0);
    system.registerZombie('new', 'mainEntrance');
    expect(system.getTarget('new', { x: 200, y: 700 }, player.end)).toEqual({ x: 1140, y: 700 });
  });
  it('detects entry and lethal contact when one movement crosses the entire breach area', () => {
    const system = combat(0);
    expect(system.resolveContacts(player, [{
      ...motion(), start: { x: 1048, y: 700 }, end: { x: 1280, y: 700 },
    }], 2000)).toBe(true);
    expect(system.getPhase()).toBe('DEFEAT');
  });
  it('does not count player contact that occurred before interior entry', () => {
    const system = combat(0);
    const outsidePlayer = { ...player, start: { x: 1048, y: 700 }, end: { x: 1048, y: 700 } };
    expect(system.resolveContacts(outsidePlayer, [{
      ...motion(), start: { x: 1048, y: 700 }, end: { x: 1140, y: 700 },
    }], 1000)).toBe(false);
    expect(system.getPhase()).toBe('COMBAT');
  });
  it('does not kill the player through an intact barricade', () => {
    const system = combat();
    expect(system.resolveContacts(player, [motion(1240)], 16)).toBe(false);
    expect(system.getPhase()).toBe('COMBAT');
  });
  it('wins at dawn even when the barricade has collapsed', () => {
    const system = combat(0);
    system.advanceTime(system.durationMs - 1, true);
    expect(system.getPhase()).toBe('COMBAT');
    system.advanceTime(1, true);
    expect(system.getPhase()).toBe('VICTORY');
    expect(formatGameTime(system.getTime())).toBe('05:00');
  });
  it('advances through midnight with the same result for split and oversized deltas', () => {
    const one = combat();
    const split = combat();
    one.advanceTime(one.durationMs * 10, true);
    for (let i = 0; i < 600; i++) split.advanceTime(split.durationMs / 600, true);
    expect(split.getTime()).toEqual(one.getTime());
    expect(split.getPhase()).toBe('VICTORY');
  });
  it.each([0, -1, NaN, Infinity])('ignores invalid time delta %s', delta => {
    const system = combat();
    system.advanceTime(delta, true);
    system.resolveContacts(player, [motion()], delta);
    expect(formatGameTime(system.getTime())).toBe('23:00');
    expect(system.getSectors()[0].integrity).toBe(80);
  });
  it('gives death precedence over dawn and freezes the result', () => {
    const system = combat();
    system.advanceTime(system.durationMs, false);
    system.advanceTime(system.durationMs, true);
    expect(system.getPhase()).toBe('DEFEAT');
  });
  it('stops barricade damage after victory', () => {
    const system = combat();
    system.advanceTime(system.durationMs, true);
    system.resolveContacts(player, [motion()], 10_000);
    expect(system.getSectors()[0].integrity).toBe(80);
  });
});
