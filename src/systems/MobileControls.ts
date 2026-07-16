import Phaser from 'phaser';

import type { MobileControlLayout } from '../logic/mobileInput';
import { joystickKnobPosition } from '../logic/mobileInput';
import type { Position } from '../logic/movement';

export class MobileControls {
  private readonly graphics: Phaser.GameObjects.Graphics;
  private readonly fireLabel: Phaser.GameObjects.Text;
  private readonly reloadLabel: Phaser.GameObjects.Text;
  private layout?: MobileControlLayout;
  private joystickPointer: Position | null = null;
  private visible = false;

  constructor(scene: Phaser.Scene) {
    this.graphics = scene.add.graphics().setDepth(200).setScrollFactor(0);
    this.fireLabel = scene.add.text(0, 0, 'FIRE', {
      color: '#ffffff',
      fontFamily: 'sans-serif',
      fontSize: '15px',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 3,
    }).setOrigin(0.5).setDepth(201).setScrollFactor(0);
    this.reloadLabel = scene.add.text(0, 0, 'R', {
      color: '#ffffff',
      fontFamily: 'sans-serif',
      fontSize: '14px',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 3,
    }).setOrigin(0.5).setDepth(201).setScrollFactor(0);
    this.setVisible(false);
  }

  setLayout(layout: MobileControlLayout): void {
    this.layout = layout;
    this.fireLabel.setPosition(layout.fire.x, layout.fire.y);
    this.reloadLabel.setPosition(layout.reload.x, layout.reload.y);
    this.redraw();
  }

  setJoystickPointer(pointer: Position | null): void {
    this.joystickPointer = pointer ? { ...pointer } : null;
    this.redraw();
  }

  setVisible(visible: boolean): void {
    this.visible = visible;
    this.graphics.setVisible(visible);
    this.fireLabel.setVisible(visible);
    this.reloadLabel.setVisible(visible);
  }

  destroy(): void {
    this.graphics.destroy();
    this.fireLabel.destroy();
    this.reloadLabel.destroy();
  }

  private redraw(): void {
    this.graphics.clear();

    if (!this.visible || !this.layout) return;

    const { joystick, fire, reload, knobRadius } = this.layout;
    const knob = joystickKnobPosition(this.joystickPointer, joystick);

    this.graphics.fillStyle(0x111111, 0.38).fillCircle(joystick.x, joystick.y, joystick.radius);
    this.graphics.lineStyle(2, 0xffffff, 0.55).strokeCircle(joystick.x, joystick.y, joystick.radius);
    this.graphics.fillStyle(0xffffff, 0.42).fillCircle(knob.x, knob.y, knobRadius);
    this.graphics.fillStyle(0xa92626, 0.62).fillCircle(fire.x, fire.y, fire.radius);
    this.graphics.lineStyle(2, 0xffffff, 0.7).strokeCircle(fire.x, fire.y, fire.radius);
    this.graphics.fillStyle(0x304866, 0.62).fillCircle(reload.x, reload.y, reload.radius);
    this.graphics.lineStyle(2, 0xffffff, 0.7).strokeCircle(reload.x, reload.y, reload.radius);
  }
}
