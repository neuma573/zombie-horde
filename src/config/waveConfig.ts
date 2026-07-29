import type { WaveConfig } from '../logic/wave';

export const WAVE_CONFIG = {
  initialDelayMs: 1_000,
  betweenWaveDelayMs: 10_000,
  spawnIntervalMs: 450,
  spawnIntervalReductionPerWaveMs: 20,
  minimumSpawnIntervalMs: 180,
  baseZombieCount: 5,
  zombiesPerWave: 3,
} as const satisfies WaveConfig;
