export interface SpawnConfig {
  playerPosition: {
    x: number;
    y: number;
  };
  minimumZombieDistanceFromPlayer: number;
}

export const SPAWN_CONFIG = {
  playerPosition: {
    x: 2_000,
    y: 1_500,
  },
  minimumZombieDistanceFromPlayer: 160,
} as const satisfies SpawnConfig;
