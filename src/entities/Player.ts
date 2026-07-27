import Phaser from 'phaser';

import { PLAYER_CONFIG } from '../config/playerConfig';
import { decayTransientLight } from '../logic/timeBasedLighting';
import {
  blendVisualColor,
  RIFLE_VISUAL,
  resolveRifleReloadVisual,
  resolveSidearmHandPose,
  resolveSidearmPose,
  SIDEARM_VISUAL,
  type SidearmPose,
  type RifleReloadVisual,
} from '../logic/playerVisual';
import type { WeaponId } from '../logic/weapon';

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
const WEAPON_RECOIL_DECAY_RATE = 15;

export class Player extends Phaser.GameObjects.Container {
  health = PLAYER_CONFIG.health;
  readonly hitRadius = PLAYER_CONFIG.radius;
  invulnerabilityRemainingMs = 0;
  isAlive = true;
  private readonly arms: Phaser.GameObjects.Graphics;
  private readonly rifleUnderArm: Phaser.GameObjects.Graphics;
  private readonly torso: Phaser.GameObjects.Ellipse;
  private readonly head: Phaser.GameObjects.Arc;
  private readonly sidearm: Phaser.GameObjects.Rectangle;
  private readonly rifle: Phaser.GameObjects.Graphics;
  private readonly rifleReload: Phaser.GameObjects.Graphics;
  private readonly muzzleReflection: Phaser.GameObjects.Graphics;
  private currentPose: SidearmPose = { ...SIDEARM_VISUAL.readyPose };
  private weaponId: WeaponId = 'pistol';
  private rifleReloadVisual: RifleReloadVisual = resolveRifleReloadVisual(false, 0);
  private muzzleReflectionIntensity = 0;
  private weaponRecoilIntensity = 0;
  private weaponRecoilDistance = 0;

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
    const rifleUnderArm = new Phaser.GameObjects.Graphics(scene);
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
    const rifle = new Phaser.GameObjects.Graphics(scene).setVisible(false);
    const rifleReload = new Phaser.GameObjects.Graphics(scene).setVisible(false);
    const muzzleReflection = new Phaser.GameObjects.Graphics(scene).setVisible(false);

    super(scene, x, y, [
      shadow,
      rifleUnderArm,
      rifle,
      arms,
      torso,
      head,
      muzzleReflection,
      rifleReload,
      sidearm,
    ]);
    this.arms = arms;
    this.rifleUnderArm = rifleUnderArm;
    this.torso = torso;
    this.head = head;
    this.sidearm = sidearm;
    this.rifle = rifle;
    this.rifleReload = rifleReload;
    this.muzzleReflection = muzzleReflection;

    scene.add.existing(this);
    this.setDepth(20);
    this.drawArms(readyPose);
  }

  setReloadVisual(isReloading: boolean, normalizedProgress: number): void {
    this.rifleReloadVisual = resolveRifleReloadVisual(isReloading, normalizedProgress);
    const pose = this.weaponId === 'burstRifle'
      ? this.rifleReloadVisual.pose
      : resolveSidearmPose(isReloading, normalizedProgress);
    this.currentPose = pose;
    const recoilOffset = this.weaponRecoilIntensity * this.weaponRecoilDistance;
    this.sidearm.setPosition(pose.x - recoilOffset, pose.y).setRotation(pose.rotation);
    this.rifle
      .setPosition(
        pose.x - RIFLE_VISUAL.readyPose.x - recoilOffset,
        pose.y,
      )
      .setRotation(pose.rotation);
    this.drawArms(pose);
    this.drawRifle();
    this.drawRifleReload();
    this.drawMuzzleReflection(pose);
  }

  setWeaponVisual(weaponId: WeaponId): void {
    if (weaponId === this.weaponId) return;
    this.weaponId = weaponId;
    const visual = weaponId === 'burstRifle' ? RIFLE_VISUAL : SIDEARM_VISUAL;
    this.sidearm.setDisplaySize(visual.length, visual.width);
    this.sidearm.setVisible(weaponId === 'pistol');
    this.rifle.setVisible(weaponId === 'burstRifle');
    this.rifleReload.setVisible(weaponId === 'burstRifle');
    this.drawRifle();
    this.drawRifleReload();
  }

  triggerMuzzleReflection(): void {
    this.muzzleReflectionIntensity = 1;
    this.applyMuzzleReflection();
  }

  triggerWeaponRecoil(recoil: number): void {
    this.weaponRecoilDistance = Math.max(0, recoil) * 0.9;
    this.weaponRecoilIntensity = 1;
  }

  updateMuzzleReflection(deltaMs: number): void {
    this.muzzleReflectionIntensity = decayTransientLight(
      this.muzzleReflectionIntensity,
      deltaMs,
      MUZZLE_REFLECTION_DECAY_RATE,
    );
    this.weaponRecoilIntensity = decayTransientLight(
      this.weaponRecoilIntensity,
      deltaMs,
      WEAPON_RECOIL_DECAY_RATE,
    );
    this.applyMuzzleReflection();
  }

  getMuzzlePosition(): { x: number; y: number } {
    const localMuzzleX = this.sidearm.x
      + Math.cos(this.sidearm.rotation) * this.weaponLength() / 2;
    const localMuzzleY = this.sidearm.y
      + Math.sin(this.sidearm.rotation) * this.weaponLength() / 2;
    const cos = Math.cos(this.rotation);
    const sin = Math.sin(this.rotation);

    return {
      x: this.x + localMuzzleX * cos - localMuzzleY * sin,
      y: this.y + localMuzzleX * sin + localMuzzleY * cos,
    };
  }

  private drawArms(pose: { x: number; y: number; rotation: number }): void {
    if (this.weaponId === 'burstRifle') {
      this.drawRifleArms();
      return;
    }

    this.rifleUnderArm.clear();
    const handPose = resolveSidearmHandPose(pose);

    this.arms.clear();
    this.drawArmPath(9, 0x05080b, handPose.leftElbow, handPose.leftHand, -9);
    this.drawArmPath(9, 0x05080b, handPose.rightElbow, handPose.rightHand, 10);
    this.drawArmPath(
      6,
      PLAYER_VISUAL_COLORS.upperArm,
      handPose.leftElbow,
      handPose.leftHand,
      -9,
    );
    this.drawArmPath(
      6,
      PLAYER_VISUAL_COLORS.lowerArm,
      handPose.rightElbow,
      handPose.rightHand,
      10,
    );
    this.arms.fillStyle(0x05080b, 1);
    this.arms.fillCircle(handPose.leftHand.x, handPose.leftHand.y, 3.5);
    this.arms.fillCircle(handPose.rightHand.x, handPose.rightHand.y, 3.5);
  }

  private drawRifleArms(): void {
    const leftHand = this.rifleReloadVisual.leftHand;
    const rightHand = this.rifleReloadVisual.rightHand;
    const reloadAmount = Math.min(
      1,
      Math.abs(this.rifleReloadVisual.pose.rotation) / 0.5,
    );
    const leftElbow = {
      x: 8 - reloadAmount * 5,
      y: -13 - reloadAmount * 5,
    };
    const rightElbow = { x: -1, y: 13 };

    this.arms.clear();
    this.rifleUnderArm.clear();
    this.drawArmPathOn(
      this.rifleUnderArm,
      9,
      0x05080b,
      rightElbow,
      rightHand,
      10,
    );
    this.drawArmPathOn(
      this.rifleUnderArm,
      6,
      PLAYER_VISUAL_COLORS.lowerArm,
      rightElbow,
      rightHand,
      10,
    );
    this.rifleUnderArm.fillStyle(0x05080b, 1);
    this.rifleUnderArm.fillCircle(rightHand.x, rightHand.y, 3.5);
    this.drawArmPathOn(
      this.rifleUnderArm,
      9,
      0x05080b,
      leftElbow,
      leftHand,
      -9,
    );
    this.drawArmPathOn(
      this.rifleUnderArm,
      6,
      PLAYER_VISUAL_COLORS.upperArm,
      leftElbow,
      leftHand,
      -9,
    );
    this.rifleUnderArm.fillStyle(0x05080b, 1);
    this.rifleUnderArm.fillCircle(leftHand.x, leftHand.y, 3.5);
  }

  private applyMuzzleReflection(): void {
    this.torso.setFillStyle(PLAYER_VISUAL_COLORS.torso);
    this.head.setFillStyle(PLAYER_VISUAL_COLORS.head);
    this.sidearm.setFillStyle(blendVisualColor(
      PLAYER_VISUAL_COLORS.sidearm,
      PLAYER_VISUAL_COLORS.sidearmReflection,
      this.muzzleReflectionIntensity,
    ));
    this.drawRifle();
    this.drawRifleReload();
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

    const gripX = pose.x - Math.cos(pose.rotation) * this.weaponLength() / 2;
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

  private weaponLength(): number {
    return this.weaponId === 'burstRifle'
      ? RIFLE_VISUAL.length
      : SIDEARM_VISUAL.length;
  }

  private drawRifle(): void {
    this.rifle.clear();
    if (this.weaponId !== 'burstRifle') return;

    const metal = blendVisualColor(
      0x343b3f,
      PLAYER_VISUAL_COLORS.sidearmReflection,
      this.muzzleReflectionIntensity,
    );
    const darkMetal = blendVisualColor(
      0x171c20,
      0x9aa7ad,
      this.muzzleReflectionIntensity * 0.65,
    );
    const furniture = blendVisualColor(
      0x20272b,
      0x89989f,
      this.muzzleReflectionIntensity * 0.55,
    );

    // Local +X is forward: stock, receiver, magazine, handguard,
    // barrel, front sight, and muzzle are distinct at gameplay scale.
    this.rifle
      .fillStyle(0x080b0d, 1)
      .fillTriangle(2, -5, 2, 5, 12, 3.5)
      .fillTriangle(2, -5, 12, -3.5, 12, 3.5)
      .fillStyle(furniture, 1)
      .fillTriangle(3, -3.8, 3, 3.8, 12, 2.8)
      .fillTriangle(3, -3.8, 12, -2.8, 12, 2.8)
      .fillStyle(0x080b0d, 1)
      .fillRoundedRect(10, -2.4, 17, 4.8, 1.2)
      .fillStyle(metal, 1)
      .fillRoundedRect(11, -1.75, 15, 3.5, 0.9)
      .fillStyle(darkMetal, 1)
      .fillRect(17, 1.4, 7, 4.5)
      .fillStyle(0x080b0d, 1)
      .fillRoundedRect(24, -4, 13, 8, 2)
      .fillStyle(furniture, 1)
      .fillRoundedRect(25, -2.7, 12, 5.4, 1.5)
      .lineStyle(1, 0x667078, 0.75);

    for (let x = 27; x <= 35; x += 3) {
      this.rifle.lineBetween(x, -2.4, x, 2.4);
    }

    this.rifle
      .fillStyle(0x090c0e, 1)
      .fillRect(37, -1.6, 10, 3.2)
      .fillStyle(metal, 1)
      .fillRect(37, -0.8, 10, 1.6)
      .fillStyle(0x080b0d, 1)
      .fillRect(40, -4, 2, 8)
      .fillRect(46, -2.2, 2, 4.4)
      .fillStyle(darkMetal, 1)
      .fillRoundedRect(
        14 + this.rifleReloadVisual.chargingHandleOffset,
        -6,
        8,
        2,
        1,
      )
      .lineStyle(1, 0x7e8a90, 0.85)
      .strokeRoundedRect(11, -1.75, 15, 3.5, 0.9);
  }

  private drawRifleReload(): void {
    this.rifleReload.clear();
    if (
      this.weaponId !== 'burstRifle'
      || !this.rifleReloadVisual.magazine.visible
    ) {
      return;
    }

    const magazine = this.rifleReloadVisual.magazine;
    this.rifleReload
      .fillStyle(0x080b0d, 1)
      .fillRoundedRect(-4, -2.5, 8, 5, 1)
      .fillStyle(0x343b3f, 1)
      .fillRoundedRect(-3, -1.5, 6, 3, 0.8)
      .setPosition(magazine.x, magazine.y)
      .setRotation(magazine.rotation);
  }

  private drawArmPath(
    width: number,
    color: number,
    elbow: { x: number; y: number },
    hand: { x: number; y: number },
    shoulderY: number,
  ): void {
    this.drawArmPathOn(this.arms, width, color, elbow, hand, shoulderY);
  }

  private drawArmPathOn(
    graphics: Phaser.GameObjects.Graphics,
    width: number,
    color: number,
    elbow: { x: number; y: number },
    hand: { x: number; y: number },
    shoulderY: number,
  ): void {
    graphics.lineStyle(width, color, 1);
    graphics.beginPath();
    graphics.moveTo(2, shoulderY);
    graphics.lineTo(elbow.x, elbow.y);
    graphics.lineTo(hand.x, hand.y);
    graphics.strokePath();
  }
}
