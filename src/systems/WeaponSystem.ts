import {
  advanceWeapon,
  createWeaponState,
  startReload,
  tryFire,
  type WeaponConfig,
  type WeaponState,
} from '../logic/weapon';

export class WeaponSystem {
  private state: WeaponState;

  constructor(private readonly config: WeaponConfig) {
    this.state = createWeaponState(config);
  }

  update(deltaMs: number): void {
    this.state = advanceWeapon(this.state, this.config, deltaMs);
  }

  fire(): boolean {
    const result = tryFire(this.state, this.config);
    this.state = result.state;
    return result.fired;
  }

  reload(): void {
    this.state = startReload(this.state, this.config);
  }

  getState(): Readonly<WeaponState> {
    return this.state;
  }
}
