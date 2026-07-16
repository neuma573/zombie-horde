import { describe, expect, it } from 'vitest';

import {
  circlesOverlap,
  resolveContactDamage,
  type ContactAttacker,
  type ContactTarget,
} from '../logic/contactDamage';

const target = (overrides: Partial<ContactTarget> = {}): ContactTarget => ({
  position: { x: 0, y: 0 },
  radius: 10,
  health: 100,
  isAlive: true,
  invulnerabilityRemainingMs: 0,
  invulnerabilityMs: 400,
  ...overrides,
});

const attacker = (overrides: Partial<ContactAttacker> = {}): ContactAttacker => ({
  position: { x: 15, y: 0 },
  radius: 5,
  damage: 10,
  attackIntervalMs: 800,
  cooldownRemainingMs: 0,
  ...overrides,
});

describe('circlesOverlap', () => {
  it('treats touching circle edges as contact', () => {
    expect(circlesOverlap(target(), attacker())).toBe(true);
    expect(circlesOverlap(target(), attacker({ position: { x: 16, y: 0 } }))).toBe(false);
  });
});

describe('resolveContactDamage', () => {
  it('does not damage the player without contact', () => {
    const result = resolveContactDamage(target(), [attacker({ position: { x: 30, y: 0 } })], 1_000);

    expect(result.health).toBe(100);
    expect(result.died).toBe(false);
  });

  it('uses independent attack cooldowns and player invulnerability for simultaneous contacts', () => {
    const result = resolveContactDamage(
      target(),
      [attacker(), attacker({ position: { x: -15, y: 0 }, attackIntervalMs: 1_200 })],
      800,
    );

    expect(result.health).toBe(80);
    expect(result.attackerCooldownsMs).toEqual([800, 400]);
  });

  it('produces the same result for equivalent delta partitions', () => {
    const oneStep = resolveContactDamage(target(), [attacker()], 2_400);
    const first = resolveContactDamage(target(), [attacker()], 1_000);
    const second = resolveContactDamage(
      target({
        health: first.health,
        isAlive: first.isAlive,
        invulnerabilityRemainingMs: first.invulnerabilityRemainingMs,
      }),
      [attacker({ cooldownRemainingMs: first.attackerCooldownsMs[0] })],
      1_400,
    );

    expect(second).toEqual(oneStep);
    expect(oneStep.health).toBe(60);
  });

  it('updates repeated attacks correctly for a large delta', () => {
    const result = resolveContactDamage(target(), [attacker()], 4_000);

    expect(result.health).toBe(40);
    expect(result.attackerCooldownsMs).toEqual([800]);
  });

  it('reports death once and ignores damage after death', () => {
    const death = resolveContactDamage(target({ health: 10 }), [attacker()], 1_000);
    const afterDeath = resolveContactDamage(
      target({ health: death.health, isAlive: death.isAlive }),
      [attacker()],
      1_000,
    );

    expect(death).toMatchObject({ health: 0, isAlive: false, died: true });
    expect(afterDeath).toMatchObject({ health: 0, isAlive: false, died: false });
  });
});
