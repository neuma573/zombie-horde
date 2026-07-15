import Phaser from 'phaser';

import { Player, PLAYER_RADIUS, PLAYER_SPEED } from '../entities/Player';
import { moveWithinBounds } from '../logic/movement';

type MovementKeys = Record<'up' | 'down' | 'left' | 'right', Phaser.Input.Keyboard.Key>;

export class GameScene extends Phaser.Scene {
  private player!: Player;
  private movementKeys?: MovementKeys;

  constructor() {
    super('GameScene');
  }

  create(): void {
    this.player = new Player(this, this.scale.width / 2, this.scale.height / 2);

    this.movementKeys = this.input.keyboard?.addKeys({
      up: Phaser.Input.Keyboard.KeyCodes.W,
      down: Phaser.Input.Keyboard.KeyCodes.S,
      left: Phaser.Input.Keyboard.KeyCodes.A,
      right: Phaser.Input.Keyboard.KeyCodes.D,
    }) as MovementKeys | undefined;
  }

  update(_time: number, deltaMs: number): void {
    if (!this.movementKeys) {
      return;
    }

    const nextPosition = moveWithinBounds(
      this.player,
      {
        x: Number(this.movementKeys.right.isDown) - Number(this.movementKeys.left.isDown),
        y: Number(this.movementKeys.down.isDown) - Number(this.movementKeys.up.isDown),
      },
      PLAYER_SPEED,
      deltaMs,
      {
        width: this.scale.width,
        height: this.scale.height,
        padding: PLAYER_RADIUS,
      },
    );

    this.player.setPosition(nextPosition.x, nextPosition.y);
  }
}
