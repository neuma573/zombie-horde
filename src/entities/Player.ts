import Phaser from 'phaser';

import { PLAYER_CONFIG } from '../config/playerConfig';
import { decayTransientLight } from '../logic/timeBasedLighting';
import {
  blendVisualColor,
  resolveSidearmPose,
  SIDEARM_VISUAL,
  type SidearmPose,
} from '../logic/playerVisual';

export const PLAYER_RADIUS = PLAYER_CONFIG.radius;
export const PLAYER_SPEED = PLAYER_CONFIG.speed;

const PLAYER_VISUAL_COLORS = {
  torso: 0x0d1218,
  torsoReflection: 0x718397,
  head: 0x252d35,
  headReflection: 0xaebac4,
  upperArm: 0x2f638f,
  upperArmReflection: 0xa9d5f2,
  lowerArm: 0x3975a3,
  lowerArmReflection: 0xbce6ff,
  sidearm: 0x727a84,
  sidearmReflection: 0xf4f0db,
} as const;
const MUZZLE_REFLECTION_DECAY_RATE = 22;

export class Player extends Phaser.GameObjects.Container {
  health = PLAYER_CONFIG.health;
  readonly hitRadius = PLAYER_CONFIG.radius;
  invulnerabilityRemainingMs = 0;
  isAlive = true;
  private readonly arms: Phaser.GameObjects.Graphics;
  private readonly torso: Phaser.GameObjects.Ellipse;
  private readonly head: Phaser.GameObjects.Arc;
  private readonly sidearm: Phaser.GameObjects.Rectangle;
  private readonly muzzleReflection: Phaser.GameObjects.Graphics;
  private currentPose: SidearmPose = { ...SIDEARM_VISUAL.readyPose };
  private muzzleReflectionIntensity = 0;

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
      PLAYER_VISUAL_COLORS.torso,
    ).setStrokeStyle(3, 0x05080b);
    const head = new Phaser.GameObjects.Arc(
      scene,
      -2,
      0,
      PLAYER_RADIUS * 0.62,
      0,
      360,
      false,
      PLAYER_VISUAL_COLORS.head,
    ).setStrokeStyle(2, 0x05080b);
    const readyPose = SIDEARM_VISUAL.readyPose;
    const sidearm = new Phaser.GameObjects.Rectangle(
      scene,
      readyPose.x,
      readyPose.y,
      SIDEARM_VISUAL.length,
      SIDEARM_VISUAL.width,
      PLAYER_VISUAL_COLORS.sidearm,
    ).setStrokeStyle(2, 0x101820);
    const muzzleReflection = new Phaser.GameObjects.Graphics(scene).setVisible(false);

    super(scene, x, y, [shadow, arms, torso, head, muzzleReflection, sidearm]);
    this.arms = arms;
    this.torso = torso;
    this.head = head;
    this.sidearm = sidearm;
    this.muzzleReflection = muzzleReflection;

    scene.add.existing(this);
    this.drawArms(readyPose);
  }

  setReloadVisual(isReloading: boolean, normalizedProgress: number): void {
    const pose = resolveSidearmPose(isReloading, normalizedProgress);
    this.currentPose = pose;
    this.sidearm.setPosition(pose.x, pose.y).setRotation(pose.rotation);
    this.drawArms(pose);
    this.drawMuzzleReflection(pose);
  }

  triggerMuzzleReflection(): void {
    this.muzzleReflectionIntensity = 1;
    this.applyMuzzleReflection();
  }

  updateMuzzleReflection(deltaMs: number): void {
    this.muzzleReflectionIntensity = decayTransientLight(
      this.muzzleReflectionIntensity,
      deltaMs,
      MUZZLE_REFLECTION_DECAY_RATE,
    );
    this.applyMuzzleReflection();
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
    this.drawArmPath(5, PLAYER_VISUAL_COLORS.upperArm, upperElbow, upperHand, -9);
    this.drawArmPath(5, PLAYER_VISUAL_COLORS.lowerArm, lowerElbow, lowerHand, 10);
    this.arms.fillStyle(0x05080b, 1);
    this.arms.fillCircle(upperHand.x, upperHand.y, 3.2);
    this.arms.fillCircle(lowerHand.x, lowerHand.y, 3.2);
  }

  private applyMuzzleReflection(): void {
    this.torso.setFillStyle(PLAYER_VISUAL_COLORS.torso);
    this.head.setFillStyle(PLAYER_VISUAL_COLORS.head);
    this.sidearm.setFillStyle(blendVisualColor(
      PLAYER_VISUAL_COLORS.sidearm,
      PLAYER_VISUAL_COLORS.sidearmReflection,
      this.muzzleReflectionIntensity,
    ));
    this.drawArms(this.currentPose);
    this.drawMuzzleReflection(this.currentPose);
  }

  private drawMuzzleReflection(pose: SidearmPose): void {
    const intensity = this.muzzleReflectionIntensity;
    this.muzzleReflection.clear().setVisible(intensity > 0.001);
    if (intensity <= 0.001) return;

    // Local +X is always the character's forward direction.
    this.muzzleReflection.fillStyle(PLAYER_VISUAL_COLORS.torsoReflection, intensity * 0.62);
    this.muzzleReflection.fillEllipse(5, 0, 11, 24);
    this.muzzleReflection.fillStyle(PLAYER_VISUAL_COLORS.headReflection, intensity * 0.78);
    this.muzzleReflection.fillEllipse(4, 0, 7, 14);

    const gripX = pose.x - Math.cos(pose.rotation) * SIDEARM_VISUAL.length / 2;
    const gripY = pose.y - Math.sin(pose.rotation) * SIDEARM_VISUAL.length / 2;
    this.muzzleReflection.lineStyle(3, PLAYER_VISUAL_COLORS.lowerArmReflection, intensity * 0.8);
    this.muzzleReflection.beginPath();
    this.muzzleReflection.moveTo(gripX * 0.58, gripY + 7);
    this.muzzleReflection.lineTo(gripX, gripY + 2);
    this.muzzleReflection.strokePath();
    this.muzzleReflection.lineStyle(3, PLAYER_VISUAL_COLORS.upperArmReflection, intensity * 0.72);
    this.muzzleReflection.beginPath();
    this.muzzleReflection.moveTo(gripX * 0.55, gripY - 8);
    this.muzzleReflection.lineTo(gripX, gripY - 2);
    this.muzzleReflection.strokePath();
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
