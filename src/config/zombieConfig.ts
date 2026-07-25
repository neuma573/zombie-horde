export interface ZombieConfig {
  health: number;
  speed: number;
  radius: number;
  contactDamage: number;
  attackWindupMs: number;
  attackIntervalMs: number;
}

export const ZOMBIE_CONFIG = {
  health: 50,
  speed: 80,
  radius: 20,
  contactDamage: 10,
  attackWindupMs: 260,
  attackIntervalMs: 800,
} as const satisfies ZombieConfig;
