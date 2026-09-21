import Phaser from 'phaser';
import { t } from '../systems/UserSettings';

/** Fades the entire combat view before accepting an explicit continuation. */
export class NightDebriefView {
  private readonly root: Phaser.GameObjects.Container;
  private readonly shade: Phaser.GameObjects.Rectangle;
  private readonly panel: Phaser.GameObjects.Container;
  private ready = false;

  constructor(private readonly scene: Phaser.Scene, day: number, kills: number, private readonly onContinue: () => void) {
    this.root = scene.add.container(0, 0).setDepth(300).setScrollFactor(0);
    this.shade = scene.add.rectangle(0, 0, 1, 1, 0x090d10).setOrigin(0).setAlpha(0).setInteractive();
    this.panel = scene.add.container(0, 0).setAlpha(0);
    this.root.add([this.shade, this.panel]);
    const text = (x: number, y: number, value: string, size: number, color: string) => scene.add.text(x, y, value, {
      fontFamily: 'sans-serif', fontSize: `${size}px`, color,
    }).setOrigin(0.5);
    const button = scene.add.rectangle(0, 113, 360, 48, 0x34443f)
      .setStrokeStyle(1, 0x8eaa98).setInteractive({ useHandCursor: true });
    this.panel.add([
      scene.add.rectangle(0, 0, 440, 330, 0x17201f).setStrokeStyle(1, 0x53635c),
      text(0, -122, t('NIGHT DEBRIEF'), 14, '#a9bdae'),
      text(0, -82, t('Night {day} survived', { day }), 26, '#eee9da'),
      scene.add.rectangle(0, -46, 360, 1, 0x53635c),
      text(-90, -12, t('Zombies killed'), 16, '#b6c3bb'),
      text(110, -12, `${kills}`, 24, '#eee9da'),
      text(-90, 42, t('Supplies gained'), 16, '#b6c3bb'),
      text(110, 42, t('None'), 20, '#eee9da'),
      button, text(0, 113, t('CONTINUE TO MORNING'), 16, '#eee9da'),
    ]);
    const readyPresses = new Set<number>();
    button.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      readyPresses.delete(pointer.id);
      if (this.ready) readyPresses.add(pointer.id);
    });
    button.on('pointerup', (pointer: Phaser.Input.Pointer) => {
      const beganReady = readyPresses.delete(pointer.id);
      if (beganReady && pointer.getDistance() <= 8 && button.getBounds().contains(pointer.downX, pointer.downY)) this.confirm();
    });
    button.on('pointerupoutside', (pointer: Phaser.Input.Pointer) => {
      readyPresses.delete(pointer.id);
    });
    scene.input.keyboard?.on('keydown-ENTER', this.confirm, this);
    scene.scale.on(Phaser.Scale.Events.RESIZE, this.resize, this);
    this.resize();
    scene.tweens.add({ targets: this.shade, alpha: 1, duration: 900, ease: 'Sine.InOut', onComplete: () => {
      scene.tweens.add({ targets: this.panel, alpha: 1, duration: 350, onComplete: () => { this.ready = true; } });
    } });
  }

  private confirm(): void {
    if (!this.ready) return;
    this.ready = false;
    this.onContinue();
  }

  private resize(): void {
    const { width, height } = this.scene.scale;
    this.shade.setSize(width, height);
    this.panel.setPosition(width / 2, height / 2).setScale(Math.min(1, (width - 32) / 440, (height - 32) / 330));
  }

  destroy(): void {
    this.scene.scale.off(Phaser.Scale.Events.RESIZE, this.resize, this);
    this.scene.input.keyboard?.off('keydown-ENTER', this.confirm, this);
    this.scene.tweens.killTweensOf([this.shade, this.panel]);
    this.root.destroy(true);
  }
}
