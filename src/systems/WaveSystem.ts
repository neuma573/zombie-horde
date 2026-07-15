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

  update(deltaMs: number, aliveZombieCount: number): number {
    const result = advanceWave(this.state, this.config, deltaMs, aliveZombieCount);
    this.state = result.state;
    return result.spawnCount;
  }

  getState(): Readonly<WaveState> {
    return this.state;
  }
}
