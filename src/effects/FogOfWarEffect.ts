import Phaser from 'phaser';

import type { FogOfWarConfig } from '../logic/fogOfWar';
import type { Vector2 } from '../logic/hitscan';
import type { Position } from '../logic/movement';

export class FogOfWarEffect {
  private readonly darkness: Phaser.GameObjects.RenderTexture;
  private readonly visionShape: Phaser.GameObjects.Graphics;
  private readonly flashlightGlow: Phaser.GameObjects.Graphics;

  constructor(
    scene: Phaser.Scene,
    private readonly config: FogOfWarConfig,
    private readonly darknessAlpha: number,
  ) {
    this.darkness = scene.add.renderTexture(0, 0, 1, 1)
      .setOrigin(0)
      .setDepth(80)
      .setScrollFactor(0);
    this.visionShape = scene.add.graphics().setScrollFactor(0).setVisible(false);
    this.flashlightGlow = scene.add.graphics()
      .setDepth(81)
      .setScrollFactor(0)
      .setBlendMode(Phaser.BlendModes.ADD);
  }

  setEnabled(enabled: boolean): void {
    this.darkness.setVisible(enabled);
    this.flashlightGlow.setVisible(enabled);
  }

  resize(width: number, height: number): void {
    this.darkness.resize(Math.max(1, width), Math.max(1, height));
  }

  update(playerScreenPosition: Position, aimDirection: Vector2): void {
    const angle = Math.atan2(aimDirection.y, aimDirection.x);
    const leftAngle = angle - this.config.viewHalfAngleRadians;
    const rightAngle = angle + this.config.viewHalfAngleRadians;
    const distance = Math.max(0, this.config.viewDistance);

    this.visionShape
      .clear()
      .fillStyle(0xffffff, 1)
      .fillCircle(
        playerScreenPosition.x,
        playerScreenPosition.y,
        Math.max(0, this.config.nearbyVisionRadius),
      )
      .beginPath()
      .moveTo(playerScreenPosition.x, playerScreenPosition.y)
      .arc(playerScreenPosition.x, playerScreenPosition.y, distance, leftAngle, rightAngle)
      .closePath()
      .fillPath();
    this.darkness
      .clear()
      .fill(0x000000, this.darknessAlpha)
      .erase([this.visionShape]);

    this.flashlightGlow
      .clear()
      .fillStyle(0xffe7ad, 0.1)
      .beginPath()
      .moveTo(playerScreenPosition.x, playerScreenPosition.y)
      .arc(playerScreenPosition.x, playerScreenPosition.y, distance, leftAngle, rightAngle)
      .closePath()
      .fillPath()
      .lineStyle(2, 0xffefc8, 0.2)
      .beginPath()
      .moveTo(playerScreenPosition.x, playerScreenPosition.y)
      .arc(playerScreenPosition.x, playerScreenPosition.y, distance, leftAngle, rightAngle)
      .closePath()
      .strokePath();
  }

  destroy(): void {
    this.flashlightGlow.destroy();
    this.visionShape.destroy();
    this.darkness.destroy();
  }
}
