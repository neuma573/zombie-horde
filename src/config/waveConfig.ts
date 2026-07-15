import type { WaveConfig } from '../logic/wave';

export const WAVE_CONFIG: WaveConfig = {
  initialDelayMs: 1_000,
  betweenWaveDelayMs: 2_000,
  spawnIntervalMs: 500,
  baseZombieCount: 3,
  zombiesPerWave: 2,
};
