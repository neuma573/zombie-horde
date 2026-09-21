import Phaser from 'phaser';
import { t } from '../systems/UserSettings';

/** Explicit confirmation after the death animation; background taps cannot restart combat. */
export class DefenseDefeatView {
  private readonly root: Phaser.GameObjects.Container;

  constructor(private readonly scene: Phaser.Scene, private readonly day: number, private readonly confirm: () => void) {
    this.root = scene.add.container(0, 0).setDepth(200).setScrollFactor(0);
    scene.scale.on(Phaser.Scale.Events.RESIZE, this.render, this);
    this.render();
  }

  private render(): void {
    this.root.removeAll(true);
    const width = this.scene.scale.width, height = this.scene.scale.height;
    const panelWidth = Math.min(360, Math.max(160, width - 32));
    const x = width / 2, y = height / 2;
    const shade = this.scene.add.rectangle(x, y, width, height, 0x0c100c, 0.65).setInteractive();
    const panel = this.scene.add.rectangle(x, y, panelWidth, 220, 0x27281f).setStrokeStyle(2, 0x8d7859);
    const title = this.scene.add.text(x, y - 32, t('You did your best, but after {day} days, you finally died.', { day: this.day }), {
      fontFamily: 'sans-serif', fontSize: '20px', fontStyle: 'bold', color: '#e0b193', align: 'center', wordWrap: { width: panelWidth - 48, useAdvancedWrap: true },
    }).setOrigin(0.5);
    const button = this.scene.add.rectangle(x, y + 65, panelWidth - 40, 48, 0x65563c)
      .setStrokeStyle(1, 0xb8a274).setInteractive({ useHandCursor: true });
    const label = this.scene.add.text(x, y + 65, t('CONFIRM'), {
      fontFamily: 'sans-serif', fontSize: '15px', color: '#fff0d3', fontStyle: 'bold',
    }).setOrigin(0.5);
    label.setScale(Math.min(1, (panelWidth - 60) / Math.max(1, label.width)));
    title.setScale(Math.min(1, (panelWidth - 40) / Math.max(1, title.width)));
    button.on('pointerup', (pointer: Phaser.Input.Pointer) => {
      if (pointer.getDistance() <= 8 && button.getBounds().contains(pointer.downX, pointer.downY)) {
        button.disableInteractive();
        this.confirm();
      }
    });
    this.root.add([shade, panel, title, button, label]);
  }

  destroy(): void {
    this.scene.scale.off(Phaser.Scale.Events.RESIZE, this.render, this);
    this.root.destroy(true);
  }
}
