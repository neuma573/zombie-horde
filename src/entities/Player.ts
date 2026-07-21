import Phaser from 'phaser';

import { PLAYER_CONFIG } from '../config/playerConfig';
import { resolveSidearmPose, SIDEARM_VISUAL } from '../logic/playerVisual';

export const PLAYER_RADIUS = PLAYER_CONFIG.radius;
export const PLAYER_SPEED = PLAYER_CONFIG.speed;

export class Player extends Phaser.GameObjects.Container {
  health = PLAYER_CONFIG.health;
  readonly hitRadius = PLAYER_CONFIG.radius;
  invulnerabilityRemainingMs = 0;
  isAlive = true;
  private readonly arms: Phaser.GameObjects.Graphics;
  private readonly sidearm: Phaser.GameObjects.Rectangle;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    const shadow = new Phaser.GameObjects.Ellipse(
      scene,
      -2,
      4,
      PLAYER_RADIUS * 1.65,
      PLAYER_RADIUS * 2.1,
      0x000000,
      0.28,
    );
    const arms = new Phaser.GameObjects.Graphics(scene);
    const torso = new Phaser.GameObjects.Ellipse(
      scene,
      -3,
      0,
      PLAYER_RADIUS * 1.55,
      PLAYER_RADIUS * 1.9,
      0x0d1218,
    ).setStrokeStyle(3, 0x05080b);
    const head = new Phaser.GameObjects.Arc(
      scene,
      -2,
      0,
      PLAYER_RADIUS * 0.62,
      0,
      360,
      false,
      0x252d35,
    ).setStrokeStyle(2, 0x05080b);
    const readyPose = SIDEARM_VISUAL.readyPose;
    const sidearm = new Phaser.GameObjects.Rectangle(
      scene,
      readyPose.x,
      readyPose.y,
      SIDEARM_VISUAL.length,
      SIDEARM_VISUAL.width,
      0x727a84,
    ).setStrokeStyle(2, 0x101820);

    super(scene, x, y, [shadow, arms, torso, head, sidearm]);
    this.arms = arms;
    this.sidearm = sidearm;

    scene.add.existing(this);
    this.drawArms(readyPose);
  }

  setReloadVisual(isReloading: boolean, normalizedProgress: number): void {
    const pose = resolveSidearmPose(isReloading, normalizedProgress);
    this.sidearm.setPosition(pose.x, pose.y).setRotation(pose.rotation);
    this.drawArms(pose);
  }

  getMuzzlePosition(): { x: number; y: number } {
    const localMuzzleX = this.sidearm.x
      + Math.cos(this.sidearm.rotation) * SIDEARM_VISUAL.length / 2;
    const localMuzzleY = this.sidearm.y
      + Math.sin(this.sidearm.rotation) * SIDEARM_VISUAL.length / 2;
    const cos = Math.cos(this.rotation);
    const sin = Math.sin(this.rotation);

    return {
      x: this.x + localMuzzleX * cos - localMuzzleY * sin,
      y: this.y + localMuzzleX * sin + localMuzzleY * cos,
    };
  }

  private drawArms(pose: { x: number; y: number; rotation: number }): void {
    const gripX = pose.x - Math.cos(pose.rotation) * SIDEARM_VISUAL.length / 2;
    const gripY = pose.y - Math.sin(pose.rotation) * SIDEARM_VISUAL.length / 2;
    const normalX = -Math.sin(pose.rotation) * 2;
    const normalY = Math.cos(pose.rotation) * 2;
    const upperHand = { x: gripX + normalX, y: gripY + normalY };
    const lowerHand = { x: gripX - normalX, y: gripY - normalY };
    const upperElbow = { x: upperHand.x * 0.42, y: upperHand.y - 14 };
    const lowerElbow = { x: lowerHand.x * 0.62, y: lowerHand.y + 10 };

    this.arms.clear();
    this.drawArmPath(8, 0x05080b, upperElbow, upperHand, -9);
    this.drawArmPath(8, 0x05080b, lowerElbow, lowerHand, 10);
    this.drawArmPath(5, 0x2f638f, upperElbow, upperHand, -9);
    this.drawArmPath(5, 0x3975a3, lowerElbow, lowerHand, 10);
    this.arms.fillStyle(0x05080b, 1);
    this.arms.fillCircle(upperHand.x, upperHand.y, 3.2);
    this.arms.fillCircle(lowerHand.x, lowerHand.y, 3.2);
  }

  private drawArmPath(
    width: number,
    color: number,
    elbow: { x: number; y: number },
    hand: { x: number; y: number },
    shoulderY: number,
  ): void {
    this.arms.lineStyle(width, color, 1);
    this.arms.beginPath();
    this.arms.moveTo(2, shoulderY);
    this.arms.lineTo(elbow.x, elbow.y);
    this.arms.lineTo(hand.x, hand.y);
    this.arms.strokePath();
  }
}
