import Phaser from 'phaser';

export const PLAYER_RADIUS = 18;
export const PLAYER_SPEED = 240;

export class Player extends Phaser.GameObjects.Arc {
  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, PLAYER_RADIUS, 0, 360, false, 0x4da6ff);

    scene.add.existing(this);
    this.setStrokeStyle(2, 0xd9efff);
  }
}
