import Phaser from 'phaser';

import { ZOMBIE_CONFIG } from '../config/zombieConfig';

export class Zombie extends Phaser.GameObjects.Arc {
  health = ZOMBIE_CONFIG.health;
  readonly hitRadius = ZOMBIE_CONFIG.radius;
  attackCooldownRemainingMs = 0;

  constructor(scene: Phaser.Scene, readonly id: string, x: number, y: number) {
    super(scene, x, y, ZOMBIE_CONFIG.radius, 0, 360, false, 0x4f9e45);

    scene.add.existing(this);
    this.setStrokeStyle(2, 0xc7efb8);
  }
}
