import { applyDamage, type DamageResult } from '../logic/damage';
import {
  movingCircleContactWindow,
  resolveContactDamage,
  type ContactAttacker,
  type ContactDamageResult,
  type ContactTarget,
} from '../logic/contactDamage';
import type { Position } from '../logic/movement';

export interface Damageable {
  health: number;
}

export interface ContactDamageable extends Damageable {
  x: number;
  y: number;
  hitRadius: number;
  isAlive: boolean;
  invulnerabilityRemainingMs: number;
}

export interface ContactDamageDealer {
  x: number;
  y: number;
  hitRadius: number;
  attackCooldownRemainingMs: number;
  attackWindupRemainingMs?: number | null;
}

export interface ContactMovementPath {
  start: Position;
  end: Position;
}

export class DamageSystem {
  apply(target: Damageable, damage: number): DamageResult {
    const result = applyDamage(target.health, damage);
    target.health = result.health;
    return result;
  }

  resolveZombieContacts(
    player: ContactDamageable,
    playerPath: ContactMovementPath,
    zombies: readonly ContactDamageDealer[],
    zombiePaths: readonly ContactMovementPath[],
    deltaMs: number,
    playerInvulnerabilityMs: number,
    zombieDamage: number,
    zombieAttackWindupMs: number,
    zombieAttackIntervalMs: number,
  ): ContactDamageResult {
    const target: ContactTarget = {
      health: player.health,
      isAlive: player.isAlive,
      invulnerabilityRemainingMs: player.invulnerabilityRemainingMs,
      invulnerabilityMs: playerInvulnerabilityMs,
    };
    const attackers: ContactAttacker[] = zombies.map((zombie, index) => {
      const zombiePath = zombiePaths[index];

      return {
        damage: zombieDamage,
        attackIntervalMs: zombieAttackIntervalMs,
        cooldownRemainingMs: zombie.attackCooldownRemainingMs,
        windupMs: zombieAttackWindupMs,
        windupRemainingMs: zombie.attackWindupRemainingMs ?? null,
        contactWindow: zombiePath
          ? movingCircleContactWindow(
            { ...playerPath, radius: player.hitRadius },
            { ...zombiePath, radius: zombie.hitRadius },
            deltaMs,
          )
          : null,
      };
    });
    const result = resolveContactDamage(target, attackers, deltaMs);

    player.health = result.health;
    player.isAlive = result.isAlive;
    player.invulnerabilityRemainingMs = result.invulnerabilityRemainingMs;
    zombies.forEach((zombie, index) => {
      zombie.attackCooldownRemainingMs = result.attackerCooldownsMs[index];
      zombie.attackWindupRemainingMs = result.attackerWindupsRemainingMs[index];
    });

    return result;
  }
}
