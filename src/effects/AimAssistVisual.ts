import Phaser from 'phaser';

const EFFECT_DEPTH = 60;
const RETICLE_GAP = 6;
const CORNER_LENGTH = 8;

export interface AimAssistVisualTarget {
  x: number;
  y: number;
  radius: number;
}

export class AimAssistVisual {
  private readonly graphics: Phaser.GameObjects.Graphics;
  private drawnRadius = -1;

  constructor(scene: Phaser.Scene) {
    this.graphics = scene.add.graphics().setDepth(EFFECT_DEPTH).setVisible(false);
  }

  show(target: AimAssistVisualTarget): void {
    const radius = Math.max(0, target.radius) + RETICLE_GAP;

    if (radius !== this.drawnRadius) {
      this.drawReticle(radius);
      this.drawnRadius = radius;
    }

    this.graphics.setPosition(target.x, target.y).setVisible(true);
  }

  hide(): void {
    this.graphics.setVisible(false);
  }

  destroy(): void {
    this.graphics.destroy();
  }

  private drawReticle(radius: number): void {
    const inner = Math.max(0, radius - CORNER_LENGTH);
    this.graphics.clear().lineStyle(2, 0xffdf70, 0.9);

    for (const x of [-1, 1]) {
      for (const y of [-1, 1]) {
        this.graphics.beginPath();
        this.graphics.moveTo(x * inner, y * radius);
        this.graphics.lineTo(x * radius, y * radius);
        this.graphics.lineTo(x * radius, y * inner);
        this.graphics.strokePath();
      }
    }
  }
}
