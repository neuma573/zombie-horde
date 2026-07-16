import Phaser from 'phaser';

import { PLAYER_CONFIG } from '../config/playerConfig';

export const PLAYER_RADIUS = PLAYER_CONFIG.radius;
export const PLAYER_SPEED = PLAYER_CONFIG.speed;

export class Player extends Phaser.GameObjects.Arc {
  health = PLAYER_CONFIG.health;
  readonly hitRadius = PLAYER_CONFIG.radius;
  invulnerabilityRemainingMs = 0;
  isAlive = true;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, PLAYER_RADIUS, 0, 360, false, 0x4da6ff);

    scene.add.existing(this);
    this.setStrokeStyle(2, 0xd9efff);
  }
}
