import type { Position } from './movement';

export interface ContactTarget {
  health: number;
  isAlive: boolean;
  invulnerabilityRemainingMs: number;
  invulnerabilityMs: number;
}

export interface ContactWindow {
  startMs: number;
  endMs: number;
}

export interface ContactAttacker {
  damage: number;
  attackIntervalMs: number;
  cooldownRemainingMs: number;
  contactWindow: ContactWindow | null;
}

export interface ContactDamageResult {
  health: number;
  isAlive: boolean;
  died: boolean;
  invulnerabilityRemainingMs: number;
  attackerCooldownsMs: number[];
  damageEvents: ContactDamageEvent[];
}

export interface ContactDamageEvent {
  timeMs: number;
  damage: number;
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

export function movingCircleContactWindow(
  first: { start: Position; end: Position; radius: number },
  second: { start: Position; end: Position; radius: number },
  deltaMs: number,
): ContactWindow | null {
  const duration = Math.max(0, deltaMs);
  const radius = Math.max(0, first.radius) + Math.max(0, second.radius);
  const startX = first.start.x - second.start.x;
  const startY = first.start.y - second.start.y;
  const movementX = first.end.x - first.start.x - (second.end.x - second.start.x);
  const movementY = first.end.y - first.start.y - (second.end.y - second.start.y);
  const a = movementX * movementX + movementY * movementY;
  const b = 2 * (startX * movementX + startY * movementY);
  const c = startX * startX + startY * startY - radius * radius;

  if (a === 0) {
    return c <= 0 ? { startMs: 0, endMs: duration } : null;
  }

  const discriminant = b * b - 4 * a * c;

  if (discriminant < 0) {
    return null;
  }

  const root = Math.sqrt(discriminant);
  const entry = (-b - root) / (2 * a);
  const exit = (-b + root) / (2 * a);

  if (exit < 0 || entry > 1) {
    return null;
  }

  return {
    startMs: Math.max(0, entry) * duration,
    endMs: Math.min(1, exit) * duration,
  };
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
  const damageEvents: ContactDamageEvent[] = [];

  while (isAlive) {
    const readyContactIndices = attackers
      .map((attacker, index) => ({ attacker, index }))
      .filter(({ attacker, index }) => (
        cooldowns[index] === 0
        && attacker.contactWindow !== null
        && elapsed >= attacker.contactWindow.startMs
        && elapsed <= attacker.contactWindow.endMs
      ))
      .map(({ index }) => index);

    for (const index of readyContactIndices) {
      const attacker = attackers[index];
      cooldowns[index] = Math.max(1, attacker.attackIntervalMs);

      if (invulnerability > 0) {
        continue;
      }

      const previousHealth = health;
      health = Math.max(0, health - Math.max(0, attacker.damage));

      if (health < previousHealth) {
        damageEvents.push({ timeMs: elapsed, damage: previousHealth - health });
      }

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
    const nextAttackTimes = attackers.flatMap((attacker, index) => {
      const window = attacker.contactWindow;

      if (window === null || elapsed > window.endMs) {
        return [];
      }

      if (elapsed < window.startMs) {
        return [window.startMs - elapsed];
      }

      return elapsed + cooldowns[index] <= window.endMs ? [cooldowns[index]] : [];
    }).filter((time) => time > 0);
    const advance = Math.min(remaining, ...nextAttackTimes);

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
    damageEvents,
  };
}
