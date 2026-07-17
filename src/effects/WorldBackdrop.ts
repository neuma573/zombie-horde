import Phaser from 'phaser';

export class WorldBackdrop {
  private readonly graphics: Phaser.GameObjects.Graphics;

  constructor(scene: Phaser.Scene) {
    this.graphics = scene.add.graphics().setDepth(-100);
  }

  resize(width: number, height: number, gridSize: number): void {
    const safeWidth = Math.max(0, width);
    const safeHeight = Math.max(0, height);
    const spacing = Math.max(1, gridSize);

    this.graphics
      .clear()
      .fillStyle(0x1b1b1b, 1)
      .fillRect(0, 0, safeWidth, safeHeight)
      .lineStyle(1, 0x343434, 0.55);

    for (let x = 0; x <= safeWidth; x += spacing) {
      this.graphics.lineBetween(x, 0, x, safeHeight);
    }
    for (let y = 0; y <= safeHeight; y += spacing) {
      this.graphics.lineBetween(0, y, safeWidth, y);
    }

    this.graphics
      .lineStyle(3, 0x555555, 0.8)
      .strokeRect(0, 0, safeWidth, safeHeight);
  }

  destroy(): void {
    this.graphics.destroy();
  }
}
