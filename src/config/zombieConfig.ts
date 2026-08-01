export interface ZombieConfig {
  health: number;
  durabilityShots: readonly number[];
  speed: number;
  radius: number;
  contactDamage: number;
  attackWindupMs: number;
  attackIntervalMs: number;
  fast: {
    initialSpawnChance: number;
    spawnChancePerWave: number;
    maximumSpawnChance: number;
    spontaneousRunChance: number;
    runCheckIntervalMs: number;
    minimumRunDurationMs: number;
    maximumRunDurationMs: number;
    minimumRunCooldownMs: number;
    maximumRunCooldownMs: number;
    proximityRunDistance: number;
    minimumSpeedMultiplier: number;
    maximumSpeedMultiplier: number;
  };
}

export const ZOMBIE_CONFIG = {
  health: 52,
  durabilityShots: [3, 4],
  speed: 100,
  radius: 20,
  contactDamage: 10,
  attackWindupMs: 260,
  attackIntervalMs: 800,
  fast: {
    initialSpawnChance: 0.05,
    spawnChancePerWave: 0.025,
    maximumSpawnChance: 0.45,
    spontaneousRunChance: 0.2,
    runCheckIntervalMs: 1_000,
    minimumRunDurationMs: 1_500,
    maximumRunDurationMs: 3_000,
    minimumRunCooldownMs: 1_000,
    maximumRunCooldownMs: 2_000,
    proximityRunDistance: 260,
    minimumSpeedMultiplier: 2,
    maximumSpeedMultiplier: 3,
  },
} as const satisfies ZombieConfig;
