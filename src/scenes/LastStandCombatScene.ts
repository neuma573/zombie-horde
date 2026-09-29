import { fadeScene } from '../effects/sceneFade';
import { GameScene } from './GameScene';
import { HAZARD_DEFENSE_CONFIG } from '../config/lastStandCombatConfig';

/** Shares the combat engine and input lifecycle with Horde, with distinct night rules. */
export class LastStandCombatScene extends GameScene {
  private entering = true;

  constructor() { super('LastStandCombatScene', HAZARD_DEFENSE_CONFIG); }

  create(): void {
    super.create();
    this.entering = true;
    this.input.enabled = false;
    void fadeScene(this, 'in').then(completed => {
      if (!completed) return;
      this.entering = false;
      this.input.enabled = true;
    });
  }

  update(time: number, deltaMs: number): void {
    // The night clock and enemies start only after the player can see the battlefield.
    if (!this.entering) super.update(time, deltaMs);
  }
}
