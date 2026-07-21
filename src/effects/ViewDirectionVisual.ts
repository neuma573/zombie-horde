import Phaser from 'phaser';

import type { Vector2 } from '../logic/hitscan';

const EFFECT_DEPTH = 65;
const ARROW_START_OFFSET = 18;
const ARROW_LENGTH = 58;
const ARROW_HEAD_LENGTH = 12;
const ARROW_HEAD_HALF_WIDTH = 7;

export class ViewDirectionVisual {
  private readonly graphics: Phaser.GameObjects.Graphics;

  constructor(scene: Phaser.Scene) {
    this.graphics = scene.add.graphics().setDepth(EFFECT_DEPTH);
    this.drawArrow();
  }

  update(position: Vector2, direction: Vector2): void {
    this.graphics
      .setPosition(position.x, position.y)
      .setRotation(Math.atan2(direction.y, direction.x));
  }

  destroy(): void {
    this.graphics.destroy();
  }

  private drawArrow(): void {
    const tipX = ARROW_START_OFFSET + ARROW_LENGTH;
    const headBaseX = tipX - ARROW_HEAD_LENGTH;

    this.graphics
      .lineStyle(3, 0x48e5ff, 0.95)
      .beginPath()
      .moveTo(ARROW_START_OFFSET, 0)
      .lineTo(tipX, 0)
      .strokePath()
      .fillStyle(0x48e5ff, 0.95)
      .fillTriangle(
        tipX,
        0,
        headBaseX,
        -ARROW_HEAD_HALF_WIDTH,
        headBaseX,
        ARROW_HEAD_HALF_WIDTH,
      );
  }
}
