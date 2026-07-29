import {
  advanceWave,
  createWaveState,
  type WaveConfig,
  type WaveState,
} from '../logic/wave';

export class WaveSystem {
  private state: WaveState;

  constructor(private readonly config: WaveConfig) {
    this.state = createWaveState(config);
  }

  update(
    deltaMs: number,
    aliveZombieCount: number,
  ): { spawnCount: number; waveCleared: boolean } {
    const previous = this.state;
    const result = advanceWave(this.state, this.config, deltaMs, aliveZombieCount);
    this.state = result.state;
    return {
      spawnCount: result.spawnCount,
      waveCleared: previous.phase === 'active'
        && previous.waveNumber > 0
        && result.state.phase === 'waiting',
    };
  }

  getState(): Readonly<WaveState> {
    return this.state;
  }
}
