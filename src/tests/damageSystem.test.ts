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
      { x: 0, y: 0 },
      [touching, distant],
      [{ x: 0, y: 0 }, { x: 100, y: 0 }],
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
      { x: 0, y: 0 },
      [touching, distant],
      [{ x: 0, y: 0 }, { x: 100, y: 0 }],
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
      { x: 0, y: 0 },
      [zombie],
      [{ x: 0, y: 0 }],
      16,
      400,
      10,
      240,
      800,
    );

    expect(player.health).toBe(100);
    expect(result.damageEvents).toEqual([]);
  });
});
