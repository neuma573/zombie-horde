import { describe, expect, it } from 'vitest';

import {
  circlesOverlap,
  movingCircleContactWindow,
  resolveContactDamage,
  type ContactAttacker,
  type ContactTarget,
} from '../logic/contactDamage';
import { moveToward } from '../logic/movement';

const target = (overrides: Partial<ContactTarget> = {}): ContactTarget => ({
  health: 100,
  isAlive: true,
  invulnerabilityRemainingMs: 0,
  invulnerabilityMs: 400,
  ...overrides,
});

const attacker = (overrides: Partial<ContactAttacker> = {}): ContactAttacker => ({
  damage: 10,
  attackIntervalMs: 800,
  cooldownRemainingMs: 0,
  contactWindow: { startMs: 0, endMs: Number.POSITIVE_INFINITY },
  ...overrides,
});

describe('circlesOverlap', () => {
  it('treats touching circle edges as contact', () => {
    const first = { position: { x: 0, y: 0 }, radius: 10 };

    expect(circlesOverlap(first, { position: { x: 15, y: 0 }, radius: 5 })).toBe(true);
    expect(circlesOverlap(first, { position: { x: 16, y: 0 }, radius: 5 })).toBe(false);
  });
});

describe('movingCircleContactWindow', () => {
  it('returns only the portion of the frame spent in contact', () => {
    const window = movingCircleContactWindow(
      { start: { x: 0, y: 0 }, end: { x: 0, y: 0 }, radius: 18 },
      { start: { x: 100, y: 0 }, end: { x: 20, y: 0 }, radius: 20 },
      1_000,
    );

    expect(window?.startMs).toBeCloseTo(775);
    expect(window?.endMs).toBe(1_000);
  });
});

describe('resolveContactDamage', () => {
  it('does not damage the player without contact', () => {
    const result = resolveContactDamage(target(), [attacker({ contactWindow: null })], 1_000);

    expect(result.health).toBe(100);
    expect(result.died).toBe(false);
  });

  it('uses independent attack cooldowns and player invulnerability for simultaneous contacts', () => {
    const result = resolveContactDamage(
      target(),
      [attacker(), attacker({ attackIntervalMs: 1_200 })],
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

    expect({ ...second, damageEvents: oneStep.damageEvents }).toEqual(oneStep);
    expect([
      ...first.damageEvents,
      ...second.damageEvents.map((event) => ({ ...event, timeMs: event.timeMs + 1_000 })),
    ]).toEqual(oneStep.damageEvents);
    expect(oneStep.health).toBe(60);
  });

  it('produces the same damage when movement enters contact in one large or two smaller frames', () => {
    const playerPosition = { x: 0, y: 0 };
    const zombieStart = { x: 100, y: 0 };
    const oneStepEnd = moveToward(zombieStart, playerPosition, 80, 1_000);
    const oneStepWindow = movingCircleContactWindow(
      { start: playerPosition, end: playerPosition, radius: 18 },
      { start: zombieStart, end: oneStepEnd, radius: 20 },
      1_000,
    );
    const oneStep = resolveContactDamage(
      target(),
      [attacker({ contactWindow: oneStepWindow })],
      1_000,
    );

    const firstEnd = moveToward(zombieStart, playerPosition, 80, 500);
    const firstWindow = movingCircleContactWindow(
      { start: playerPosition, end: playerPosition, radius: 18 },
      { start: zombieStart, end: firstEnd, radius: 20 },
      500,
    );
    const first = resolveContactDamage(
      target(),
      [attacker({ contactWindow: firstWindow })],
      500,
    );
    const secondEnd = moveToward(firstEnd, playerPosition, 80, 500);
    const secondWindow = movingCircleContactWindow(
      { start: playerPosition, end: playerPosition, radius: 18 },
      { start: firstEnd, end: secondEnd, radius: 20 },
      500,
    );
    const second = resolveContactDamage(
      target({
        health: first.health,
        isAlive: first.isAlive,
        invulnerabilityRemainingMs: first.invulnerabilityRemainingMs,
      }),
      [attacker({
        cooldownRemainingMs: first.attackerCooldownsMs[0],
        contactWindow: secondWindow,
      })],
      500,
    );

    expect(oneStep.health).toBe(90);
    expect({ ...second, damageEvents: oneStep.damageEvents }).toEqual(oneStep);
    expect([
      ...first.damageEvents,
      ...second.damageEvents.map((event) => ({ ...event, timeMs: event.timeMs + 500 })),
    ]).toEqual(oneStep.damageEvents);
    expect(oneStep.attackerCooldownsMs).toEqual([575]);
  });

  it('updates repeated attacks correctly for a large delta', () => {
    const result = resolveContactDamage(target(), [attacker()], 4_000);

    expect(result.health).toBe(40);
    expect(result.attackerCooldownsMs).toEqual([800]);
    expect(result.damageEvents).toHaveLength(6);
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
    expect(death.damageEvents).toEqual([{ timeMs: 0, damage: 10 }]);
    expect(afterDeath.damageEvents).toEqual([]);
  });
});
