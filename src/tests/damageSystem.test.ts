import { describe, expect, it } from 'vitest';

import { DamageSystem } from '../systems/DamageSystem';

describe('DamageSystem contact attackers', () => {
  it('delays damage until a touching zombie completes its windup', () => {
    const system = new DamageSystem();
    const player = {
      x: 0,
      y: 0,
      hitRadius: 10,
      health: 100,
      isAlive: true,
      invulnerabilityRemainingMs: 0,
    };
    const touching = {
      x: 0,
      y: 0,
      hitRadius: 10,
      attackCooldownRemainingMs: 0,
      attackWindupRemainingMs: null as number | null,
    };
    const distant = {
      x: 100,
      y: 0,
      hitRadius: 10,
      attackCooldownRemainingMs: 0,
      attackWindupRemainingMs: null as number | null,
    };

    const result = system.resolveZombieContacts(
      player,
      { start: { x: 0, y: 0 }, end: { x: 0, y: 0 } },
      [touching, distant],
      [
        { start: { x: 0, y: 0 }, end: { x: 0, y: 0 } },
        { start: { x: 100, y: 0 }, end: { x: 100, y: 0 } },
      ],
      16,
      400,
      10,
      240,
      800,
    );

    expect(player.health).toBe(100);
    expect(result.damageEvents).toEqual([]);
    expect(touching.attackWindupRemainingMs).toBe(224);

    const impact = system.resolveZombieContacts(
      player,
      { start: { x: 0, y: 0 }, end: { x: 0, y: 0 } },
      [touching, distant],
      [
        { start: { x: 0, y: 0 }, end: { x: 0, y: 0 } },
        { start: { x: 100, y: 0 }, end: { x: 100, y: 0 } },
      ],
      224,
      400,
      10,
      240,
      800,
    );

    expect(player.health).toBe(90);
    expect(impact.damageEvents).toEqual([{ timeMs: 224, damage: 10 }]);
    expect(touching.attackWindupRemainingMs).toBeNull();
    expect(touching.attackCooldownRemainingMs).toBe(560);
  });

  it('does not report a cooling-down zombie without a new attack', () => {
    const system = new DamageSystem();
    const player = {
      x: 0,
      y: 0,
      hitRadius: 10,
      health: 100,
      isAlive: true,
      invulnerabilityRemainingMs: 0,
    };
    const zombie = {
      x: 0,
      y: 0,
      hitRadius: 10,
      attackCooldownRemainingMs: 500,
    };

    const result = system.resolveZombieContacts(
      player,
      { start: { x: 0, y: 0 }, end: { x: 0, y: 0 } },
      [zombie],
      [{ start: { x: 0, y: 0 }, end: { x: 0, y: 0 } }],
      16,
      400,
      10,
      240,
      800,
    );

    expect(player.health).toBe(100);
    expect(result.damageEvents).toEqual([]);
  });

  it('uses pre-separation movement endpoints for contact timing', () => {
    const system = new DamageSystem();
    const player = {
      x: 0,
      y: 0,
      hitRadius: 10,
      health: 100,
      isAlive: true,
      invulnerabilityRemainingMs: 0,
    };
    const zombie = {
      // This is the rendered, separated position. Contact timing must not use it.
      x: 20,
      y: 0,
      hitRadius: 10,
      attackCooldownRemainingMs: 0,
      attackWindupRemainingMs: null as number | null,
    };

    const result = system.resolveZombieContacts(
      player,
      { start: { x: 0, y: 0 }, end: { x: 0, y: 0 } },
      [zombie],
      [{ start: { x: 100, y: 0 }, end: { x: 0, y: 0 } }],
      1_000,
      0,
      10,
      100,
      800,
    );

    expect(result.damageEvents).toEqual([{ timeMs: 900, damage: 10 }]);
    expect(player.health).toBe(90);
  });

  it('preserves contact attack state across large and partitioned movement paths', () => {
    const createPlayer = () => ({
      x: 0,
      y: 0,
      hitRadius: 10,
      health: 100,
      isAlive: true,
      invulnerabilityRemainingMs: 0,
    });
    const createZombie = () => ({
      x: 20,
      y: 0,
      hitRadius: 10,
      attackCooldownRemainingMs: 0,
      attackWindupRemainingMs: null as number | null,
    });
    const oneStepSystem = new DamageSystem();
    const oneStepPlayer = createPlayer();
    const oneStepZombie = createZombie();
    const oneStep = oneStepSystem.resolveZombieContacts(
      oneStepPlayer,
      { start: { x: 0, y: 0 }, end: { x: 0, y: 0 } },
      [oneStepZombie],
      [{ start: { x: 100, y: 0 }, end: { x: 0, y: 0 } }],
      1_000,
      0,
      10,
      100,
      800,
    );

    const splitSystem = new DamageSystem();
    const splitPlayer = createPlayer();
    const splitZombie = createZombie();
    const firstHalf = splitSystem.resolveZombieContacts(
      splitPlayer,
      { start: { x: 0, y: 0 }, end: { x: 0, y: 0 } },
      [splitZombie],
      [{ start: { x: 100, y: 0 }, end: { x: 50, y: 0 } }],
      500,
      0,
      10,
      100,
      800,
    );
    const secondHalf = splitSystem.resolveZombieContacts(
      splitPlayer,
      { start: { x: 0, y: 0 }, end: { x: 0, y: 0 } },
      [splitZombie],
      [{ start: { x: 50, y: 0 }, end: { x: 0, y: 0 } }],
      500,
      0,
      10,
      100,
      800,
    );

    expect(firstHalf.damageEvents).toEqual([]);
    expect(splitPlayer.health).toBe(oneStepPlayer.health);
    expect(splitZombie.attackCooldownRemainingMs)
      .toBe(oneStepZombie.attackCooldownRemainingMs);
    expect(splitZombie.attackWindupRemainingMs)
      .toBe(oneStepZombie.attackWindupRemainingMs);
    expect(secondHalf.damageEvents.map((event) => ({
      ...event,
      timeMs: event.timeMs + 500,
    }))).toEqual(oneStep.damageEvents);
  });
});
