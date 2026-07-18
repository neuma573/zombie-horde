import Phaser from 'phaser';

import type { RectangleObstacle } from '../logic/obstacleCollision';

export class Obstacle extends Phaser.GameObjects.Rectangle {
  readonly collisionBounds: RectangleObstacle;

  constructor(scene: Phaser.Scene, bounds: RectangleObstacle) {
    super(
      scene,
      bounds.x + bounds.width / 2,
      bounds.y + bounds.height / 2,
      bounds.width,
      bounds.height,
      0x575044,
    );
    this.collisionBounds = { ...bounds };
    scene.add.existing(this);
    this.setDepth(-10).setStrokeStyle(3, 0x8f826d);
  }
}
