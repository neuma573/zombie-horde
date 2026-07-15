export interface DamageResult {
  health: number;
  died: boolean;
}

export function applyDamage(currentHealth: number, damage: number): DamageResult {
  const wasAlive = currentHealth > 0;
  const health = Math.max(0, currentHealth - Math.max(0, damage));

  return {
    health,
    died: wasAlive && health === 0,
  };
}
