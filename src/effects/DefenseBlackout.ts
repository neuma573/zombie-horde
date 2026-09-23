import Phaser from 'phaser';

/** Screen-space defeat presentation, independent of contact and death rules. */
export class DefenseBlackout {
  private readonly shade: Phaser.GameObjects.Rectangle;
  private readonly tween: Phaser.Tweens.Tween;
  constructor(private readonly scene: Phaser.Scene, complete: () => void) {
    this.shade = scene.add.rectangle(0, 0, scene.scale.width, scene.scale.height, 0x000000)
      .setOrigin(0).setScrollFactor(0).setDepth(199).setAlpha(0).setInteractive();
    this.tween = scene.tweens.add({ targets: this.shade, alpha: 1, duration: 650, onComplete: complete });
    scene.scale.on(Phaser.Scale.Events.RESIZE, this.resize, this);
  }
  private resize(): void { this.shade.setSize(this.scene.scale.width, this.scene.scale.height); }
  destroy(): void {
    this.scene.scale.off(Phaser.Scale.Events.RESIZE, this.resize, this);
    this.tween.remove();
    this.shade.destroy();
  }
}
