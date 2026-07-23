import { describe, expect, it } from 'vitest';

import {
  advanceWave,
  createWaveState,
  spawnIntervalForWave,
  zombieCountForWave,
  type WaveConfig,
} from '../logic/wave';

const config: WaveConfig = {
  initialDelayMs: 100,
  betweenWaveDelayMs: 200,
  spawnIntervalMs: 50,
  spawnIntervalReductionPerWaveMs: 5,
  minimumSpawnIntervalMs: 20,
  baseZombieCount: 3,
  zombiesPerWave: 2,
};

describe('wave logic', () => {
  it('waits before starting the first wave', () => {
    const initial = createWaveState(config);
    const waiting = advanceWave(initial, config, 99, 0);
    const started = advanceWave(waiting.state, config, 1, 0);

    expect(waiting).toEqual({
      state: { ...initial, timerMs: 1 },
      spawnCount: 0,
    });
    expect(started.spawnCount).toBe(1);
    expect(started.state).toMatchObject({
      phase: 'spawning',
      waveNumber: 1,
      remainingToSpawn: 2,
    });
  });

  it('spawns the configured count at the configured interval', () => {
    const initial = createWaveState(config);
    const result = advanceWave(initial, config, 200, 0);

    expect(result.spawnCount).toBe(3);
    expect(result.state).toEqual({
      phase: 'active',
      waveNumber: 1,
      remainingToSpawn: 0,
      timerMs: 0,
    });
  });

  it('does not start the next wave while a zombie remains alive', () => {
    const active = {
      phase: 'active' as const,
      waveNumber: 1,
      remainingToSpawn: 0,
      timerMs: 0,
    };

    expect(advanceWave(active, config, 1_000, 1)).toEqual({ state: active, spawnCount: 0 });
  });

  it('starts the next wave only after spawning completes and all zombies die', () => {
    const active = {
      phase: 'active' as const,
      waveNumber: 1,
      remainingToSpawn: 0,
      timerMs: 0,
    };
    const waiting = advanceWave(active, config, 199, 0);
    const nextWave = advanceWave(waiting.state, config, 1, 0);

    expect(waiting.state).toMatchObject({ phase: 'waiting', waveNumber: 1, timerMs: 1 });
    expect(nextWave.state).toMatchObject({ phase: 'spawning', waveNumber: 2 });
    expect(nextWave.spawnCount).toBe(1);
  });

  it('increases zombie count without imposing a final wave', () => {
    expect(zombieCountForWave(1, config)).toBe(3);
    expect(zombieCountForWave(50, config)).toBe(101);
  });

  it('reduces spawn intervals gradually without crossing the configured floor', () => {
    expect(spawnIntervalForWave(1, config)).toBe(50);
    expect(spawnIntervalForWave(4, config)).toBe(35);
    expect(spawnIntervalForWave(100, config)).toBe(20);
  });

  it('does not lose spawn events when delta spans multiple intervals', () => {
    const initial = createWaveState(config);
    const oneUpdate = advanceWave(initial, config, 200, 0);
    const firstHalf = advanceWave(initial, config, 150, 0);
    const secondHalf = advanceWave(firstHalf.state, config, 50, firstHalf.spawnCount);

    expect(firstHalf.spawnCount + secondHalf.spawnCount).toBe(oneUpdate.spawnCount);
    expect(secondHalf.state).toEqual(oneUpdate.state);
  });
});
