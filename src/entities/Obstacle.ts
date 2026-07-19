import Phaser from 'phaser';

import type { RectangleObstacle } from '../logic/obstacleCollision';

export class Obstacle extends Phaser.GameObjects.Rectangle {
  constructor(scene: Phaser.Scene, config: RectangleObstacle) {
    super(
      scene,
      config.x + config.width / 2,
      config.y + config.height / 2,
      config.width,
      config.height,
      0x4b5563,
    );

    scene.add.existing(this);
    this.setStrokeStyle(3, 0x94a3b8);
  }
}
