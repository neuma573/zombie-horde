import { applyDamage, type DamageResult } from '../logic/damage';

export interface Damageable {
  health: number;
}

export class DamageSystem {
  apply(target: Damageable, damage: number): DamageResult {
    const result = applyDamage(target.health, damage);
    target.health = result.health;
    return result;
  }
}
