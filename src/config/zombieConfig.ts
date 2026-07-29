export interface ZombieConfig {
  health: number;
  durabilityShots: readonly number[];
  speed: number;
  radius: number;
  contactDamage: number;
  attackWindupMs: number;
  attackIntervalMs: number;
}

export const ZOMBIE_CONFIG = {
  health: 52,
  durabilityShots: [3, 4],
  speed: 100,
  radius: 20,
  contactDamage: 10,
  attackWindupMs: 260,
  attackIntervalMs: 800,
} as const satisfies ZombieConfig;
