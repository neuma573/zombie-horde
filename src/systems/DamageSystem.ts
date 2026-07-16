import { applyDamage, type DamageResult } from '../logic/damage';
import {
  resolveContactDamage,
  type ContactAttacker,
  type ContactDamageResult,
  type ContactTarget,
} from '../logic/contactDamage';

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
}

export class DamageSystem {
  apply(target: Damageable, damage: number): DamageResult {
    const result = applyDamage(target.health, damage);
    target.health = result.health;
    return result;
  }

  resolveZombieContacts(
    player: ContactDamageable,
    zombies: readonly ContactDamageDealer[],
    deltaMs: number,
    playerInvulnerabilityMs: number,
    zombieDamage: number,
    zombieAttackIntervalMs: number,
  ): ContactDamageResult {
    const target: ContactTarget = {
      position: { x: player.x, y: player.y },
      radius: player.hitRadius,
      health: player.health,
      isAlive: player.isAlive,
      invulnerabilityRemainingMs: player.invulnerabilityRemainingMs,
      invulnerabilityMs: playerInvulnerabilityMs,
    };
    const attackers: ContactAttacker[] = zombies.map((zombie) => ({
      position: { x: zombie.x, y: zombie.y },
      radius: zombie.hitRadius,
      damage: zombieDamage,
      attackIntervalMs: zombieAttackIntervalMs,
      cooldownRemainingMs: zombie.attackCooldownRemainingMs,
    }));
    const result = resolveContactDamage(target, attackers, deltaMs);

    player.health = result.health;
    player.isAlive = result.isAlive;
    player.invulnerabilityRemainingMs = result.invulnerabilityRemainingMs;
    zombies.forEach((zombie, index) => {
      zombie.attackCooldownRemainingMs = result.attackerCooldownsMs[index];
    });

    return result;
  }
}
