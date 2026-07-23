export type WavePhase = 'waiting' | 'spawning' | 'active';

export interface WaveConfig {
  initialDelayMs: number;
  betweenWaveDelayMs: number;
  spawnIntervalMs: number;
  spawnIntervalReductionPerWaveMs: number;
  minimumSpawnIntervalMs: number;
  baseZombieCount: number;
  zombiesPerWave: number;
}

export interface WaveState {
  phase: WavePhase;
  waveNumber: number;
  remainingToSpawn: number;
  timerMs: number;
}

export interface WaveUpdate {
  state: WaveState;
  spawnCount: number;
}

export function createWaveState(config: WaveConfig): WaveState {
  return {
    phase: 'waiting',
    waveNumber: 0,
    remainingToSpawn: 0,
    timerMs: config.initialDelayMs,
  };
}

export function zombieCountForWave(waveNumber: number, config: WaveConfig): number {
  return config.baseZombieCount + Math.max(0, waveNumber - 1) * config.zombiesPerWave;
}

export function spawnIntervalForWave(waveNumber: number, config: WaveConfig): number {
  const reduction = Math.max(0, waveNumber - 1)
    * Math.max(0, config.spawnIntervalReductionPerWaveMs);
  return Math.max(
    Math.max(0, config.minimumSpawnIntervalMs),
    Math.max(0, config.spawnIntervalMs) - reduction,
  );
}

export function advanceWave(
  current: WaveState,
  config: WaveConfig,
  deltaMs: number,
  aliveZombieCount: number,
): WaveUpdate {
  const state = { ...current };
  let remainingDeltaMs = Math.max(0, deltaMs);
  let spawnCount = 0;

  if (state.phase === 'active') {
    if (aliveZombieCount > 0) {
      return { state, spawnCount };
    }

    state.phase = 'waiting';
    state.timerMs = config.betweenWaveDelayMs;
  }

  while (state.phase !== 'active') {
    if (state.phase === 'waiting') {
      if (remainingDeltaMs < state.timerMs) {
        state.timerMs -= remainingDeltaMs;
        break;
      }

      remainingDeltaMs -= state.timerMs;
      state.waveNumber += 1;
      state.remainingToSpawn = zombieCountForWave(state.waveNumber, config);
      state.phase = 'spawning';
      state.timerMs = 0;
    }

    if (state.remainingToSpawn === 0) {
      state.phase = 'active';
      state.timerMs = 0;
      break;
    }

    if (remainingDeltaMs < state.timerMs) {
      state.timerMs -= remainingDeltaMs;
      break;
    }

    remainingDeltaMs -= state.timerMs;
    state.remainingToSpawn -= 1;
    spawnCount += 1;
    state.timerMs = spawnIntervalForWave(state.waveNumber, config);

    if (state.remainingToSpawn === 0) {
      state.phase = 'active';
      state.timerMs = 0;
    }
  }

  return { state, spawnCount };
}
