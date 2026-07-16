import type { Position } from './movement';

export interface ContactTarget {
  position: Position;
  radius: number;
  health: number;
  isAlive: boolean;
  invulnerabilityRemainingMs: number;
  invulnerabilityMs: number;
}

export interface ContactAttacker {
  position: Position;
  radius: number;
  damage: number;
  attackIntervalMs: number;
  cooldownRemainingMs: number;
}

export interface ContactDamageResult {
  health: number;
  isAlive: boolean;
  died: boolean;
  invulnerabilityRemainingMs: number;
  attackerCooldownsMs: number[];
}

export function circlesOverlap(
  first: { position: Position; radius: number },
  second: { position: Position; radius: number },
): boolean {
  const radius = Math.max(0, first.radius) + Math.max(0, second.radius);
  const offsetX = first.position.x - second.position.x;
  const offsetY = first.position.y - second.position.y;

  return offsetX * offsetX + offsetY * offsetY <= radius * radius;
}

export function resolveContactDamage(
  target: ContactTarget,
  attackers: readonly ContactAttacker[],
  deltaMs: number,
): ContactDamageResult {
  const duration = Math.max(0, deltaMs);
  const cooldowns = attackers.map((attacker) => Math.max(0, attacker.cooldownRemainingMs));
  let invulnerability = Math.max(0, target.invulnerabilityRemainingMs);
  let health = Math.max(0, target.health);
  let isAlive = target.isAlive && health > 0;
  let died = false;
  let elapsed = 0;

  while (isAlive) {
    const readyContactIndices = attackers
      .map((attacker, index) => ({ attacker, index }))
      .filter(({ attacker, index }) => cooldowns[index] === 0 && circlesOverlap(target, attacker))
      .map(({ index }) => index);

    for (const index of readyContactIndices) {
      const attacker = attackers[index];
      cooldowns[index] = Math.max(1, attacker.attackIntervalMs);

      if (invulnerability > 0) {
        continue;
      }

      health = Math.max(0, health - Math.max(0, attacker.damage));

      if (attacker.damage > 0) {
        invulnerability = Math.max(0, target.invulnerabilityMs);
      }

      if (health === 0) {
        isAlive = false;
        died = true;
        break;
      }
    }

    if (!isAlive || elapsed >= duration) {
      break;
    }

    const remaining = duration - elapsed;
    const contactCooldowns = attackers
      .map((attacker, index) => circlesOverlap(target, attacker) ? cooldowns[index] : Number.POSITIVE_INFINITY)
      .filter((cooldown) => cooldown > 0);
    const nextAttack = Math.min(remaining, ...contactCooldowns);
    const advance = Number.isFinite(nextAttack) ? nextAttack : remaining;

    for (let index = 0; index < cooldowns.length; index += 1) {
      cooldowns[index] = Math.max(0, cooldowns[index] - advance);
    }
    invulnerability = Math.max(0, invulnerability - advance);
    elapsed += advance;
  }

  if (!isAlive || elapsed < duration) {
    const remaining = duration - elapsed;
    for (let index = 0; index < cooldowns.length; index += 1) {
      cooldowns[index] = Math.max(0, cooldowns[index] - remaining);
    }
    invulnerability = Math.max(0, invulnerability - remaining);
  }

  return {
    health,
    isAlive,
    died,
    invulnerabilityRemainingMs: invulnerability,
    attackerCooldownsMs: cooldowns,
  };
}
