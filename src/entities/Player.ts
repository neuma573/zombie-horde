import Phaser from 'phaser';

import { HUMANOID_VISUAL } from '../config/characterVisualConfig';
import { WORLD_RENDER_DEPTH } from '../config/renderDepth';
import { PLAYER_CONFIG } from '../config/playerConfig';
import { decayTransientLight } from '../logic/timeBasedLighting';
import {
  blendVisualColor,
  clampPonytailRelativeRotation,
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
export type PlayerAppearance = 'male-swat' | 'female-swat';

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
  sidearmSlide: 0x4b3038,
  sidearmSlideReflection: 0xd9c2b7,
  sidearmMetal: 0xa49b96,
  sidearmMetalReflection: 0xfff4db,
} as const;
const FEMALE_VISUAL_COLORS = {
  top: 0x111318,
  bottom: 0x16191f,
  equipment: 0x090b0f,
  equipmentHighlight: 0x252a32,
  hair: 0x2b1b18,
  hairHighlight: 0x4a2c25,
  skin: 0xc98f72,
  topReflection: 0x777d87,
  hairReflection: 0x8a5845,
  skinReflection: 0xf2c6a0,
} as const;
const MUZZLE_REFLECTION_DECAY_RATE = 22;
const WEAPON_RECOIL_DECAY_RATE = 15;
const PONYTAIL_FOLLOW_RATE = 10;
const PONYTAIL_SWAY_SPEED = 0.012;
const PONYTAIL_MAX_LAG_RADIANS = Math.PI * 0.4;
const PONYTAIL_SHOT_SWAY_RADIANS = 0.065;
const PONYTAIL_SHOT_SWAY_DECAY_RATE = 18;

export class Player extends Phaser.GameObjects.Container {
  health: number = PLAYER_CONFIG.health;
  readonly hitRadius = PLAYER_CONFIG.radius;
  invulnerabilityRemainingMs = 0;
  isAlive = true;
  private readonly arms: Phaser.GameObjects.Graphics;
  private readonly rifleUnderArm: Phaser.GameObjects.Graphics;
  private readonly femaleBody?: Phaser.GameObjects.Graphics;
  private readonly femaleHead?: Phaser.GameObjects.Graphics;
  private readonly ponytail?: Phaser.GameObjects.Graphics;
  private readonly torso: Phaser.GameObjects.Graphics;
  private readonly head: Phaser.GameObjects.Graphics;
  private readonly sidearm: Phaser.GameObjects.Graphics;
  private readonly rifle: Phaser.GameObjects.Graphics;
  private readonly rifleReload: Phaser.GameObjects.Graphics;
  private readonly muzzleReflection: Phaser.GameObjects.Graphics;
  private currentPose: SidearmPose = { ...SIDEARM_VISUAL.readyPose };
  private weaponId: WeaponId = 'pistol';
  private rifleReloadVisual: RifleReloadVisual = resolveRifleReloadVisual(false, 0);
  private muzzleReflectionIntensity = 0;
  private weaponRecoilIntensity = 0;
  private weaponRecoilDistance = 0;
  private ponytailWorldRotation = 0;
  private ponytailSwayTimeMs = 0;
  private movementAmount = 0;
  private ponytailShotSwayIntensity = 0;
  private ponytailShotSwayDirection = 1;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    readonly appearance: PlayerAppearance = 'male-swat',
  ) {
    const shadow = new Phaser.GameObjects.Ellipse(
      scene,
      HUMANOID_VISUAL.shadow.offsetX,
      HUMANOID_VISUAL.shadow.offsetY,
      PLAYER_RADIUS * HUMANOID_VISUAL.shadow.widthRadiusScale,
      PLAYER_RADIUS * HUMANOID_VISUAL.shadow.heightRadiusScale,
      HUMANOID_VISUAL.shadow.color,
      HUMANOID_VISUAL.shadow.alpha,
    );
    const arms = new Phaser.GameObjects.Graphics(scene);
    const rifleUnderArm = new Phaser.GameObjects.Graphics(scene);
    const ponytail = appearance === 'female-swat'
      ? new Phaser.GameObjects.Graphics(scene)
      : undefined;
    const femaleBody = appearance === 'female-swat'
      ? new Phaser.GameObjects.Graphics(scene)
      : undefined;
    const femaleHead = appearance === 'female-swat'
      ? new Phaser.GameObjects.Graphics(scene)
      : undefined;
    const torso = new Phaser.GameObjects.Graphics(scene)
      .setVisible(appearance === 'male-swat');
    const head = new Phaser.GameObjects.Graphics(scene)
      .setVisible(appearance === 'male-swat');
    const readyPose = SIDEARM_VISUAL.readyPose;
    const sidearm = new Phaser.GameObjects.Graphics(scene)
      .setPosition(readyPose.x, readyPose.y);
    const rifle = new Phaser.GameObjects.Graphics(scene).setVisible(false);
    const rifleReload = new Phaser.GameObjects.Graphics(scene).setVisible(false);
    const muzzleReflection = new Phaser.GameObjects.Graphics(scene).setVisible(false);

    const layers = appearance === 'female-swat'
      ? [
        shadow,
        femaleBody!,
        ponytail!,
        rifleUnderArm,
        rifle,
        arms,
        femaleHead!,
        muzzleReflection,
        rifleReload,
        sidearm,
      ]
      : [
        shadow,
        rifleUnderArm,
        rifle,
        arms,
        torso,
        head,
        muzzleReflection,
        rifleReload,
        sidearm,
      ];

    super(scene, x, y, layers);
    this.arms = arms;
    this.rifleUnderArm = rifleUnderArm;
    this.femaleBody = femaleBody;
    this.femaleHead = femaleHead;
    this.ponytail = ponytail;
    this.torso = torso;
    this.head = head;
    this.sidearm = sidearm;
    this.rifle = rifle;
    this.rifleReload = rifleReload;
    this.muzzleReflection = muzzleReflection;

    scene.add.existing(this);
    this.setDepth(WORLD_RENDER_DEPTH.player);
    this.drawMaleAppearance();
    this.drawFemaleAppearance();
    this.drawArms(readyPose);
    this.drawSidearm();
  }

  setReloadVisual(isReloading: boolean, normalizedProgress: number): void {
    this.rifleReloadVisual = resolveRifleReloadVisual(isReloading, normalizedProgress);
    const pose = this.weaponId === 'burstRifle'
      ? this.rifleReloadVisual.pose
      : resolveSidearmPose(isReloading, normalizedProgress);
    this.currentPose = pose;
    const recoilOffset = this.weaponRecoilIntensity * this.weaponRecoilDistance;
    this.sidearm.setPosition(pose.x - recoilOffset, pose.y).setRotation(pose.rotation);
    const headVisual = this.femaleHead ?? this.head;
    if (this.weaponId === 'pistol' && isReloading) {
      const headIndex = this.getIndex(headVisual);
      if (this.getIndex(this.sidearm) > headIndex) {
        this.moveTo(this.sidearm, headIndex);
      }
    } else {
      this.bringToTop(this.sidearm);
    }
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
    this.sidearm.setVisible(weaponId === 'pistol');
    this.rifle.setVisible(weaponId === 'burstRifle');
    this.rifleReload.setVisible(weaponId === 'burstRifle');
    this.drawRifle();
    this.drawRifleReload();
  }

  triggerMuzzleReflection(triggerPonytailSway = true): void {
    this.muzzleReflectionIntensity = 1;
    if (triggerPonytailSway && this.appearance === 'female-swat') {
      this.ponytailShotSwayDirection *= -1;
      this.ponytailShotSwayIntensity = 1;
    }
    this.applyMuzzleReflection();
  }

  triggerWeaponRecoil(recoil: number): void {
    this.weaponRecoilDistance = Math.max(0, recoil) * 0.9;
    this.weaponRecoilIntensity = 1;
  }

  updateVisual(deltaMs: number, isMoving = false): void {
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
    this.ponytailShotSwayIntensity = decayTransientLight(
      this.ponytailShotSwayIntensity,
      deltaMs,
      PONYTAIL_SHOT_SWAY_DECAY_RATE,
    );
    this.updateFemaleMovement(deltaMs, isMoving);
    this.applyMuzzleReflection();
  }

  updateMuzzleReflection(deltaMs: number): void {
    this.updateVisual(deltaMs);
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
    const armOutlineWidth = this.appearance === 'female-swat' ? 6 : 9;
    const armWidth = this.appearance === 'female-swat' ? 5 : 6;

    this.arms.clear();
    const leftShoulderY = this.appearance === 'female-swat'
      ? -8
      : -HUMANOID_VISUAL.shoulderY;
    const rightShoulderY = this.appearance === 'female-swat'
      ? 9
      : HUMANOID_VISUAL.shoulderY;
    const handPose = resolveSidearmHandPose(pose, {
      leftY: leftShoulderY,
      rightY: rightShoulderY,
    });
    this.drawArmPath(
      armOutlineWidth,
      0x05080b,
      handPose.leftElbow,
      handPose.leftHand,
      leftShoulderY,
    );
    this.drawArmPath(
      armOutlineWidth,
      0x05080b,
      handPose.rightElbow,
      handPose.rightHand,
      rightShoulderY,
    );
    this.drawArmPath(
      armWidth,
      this.armColor('upper'),
      handPose.leftElbow,
      handPose.leftHand,
      leftShoulderY,
    );
    this.drawArmPath(
      armWidth,
      this.armColor('lower'),
      handPose.rightElbow,
      handPose.rightHand,
      rightShoulderY,
    );
    if (this.appearance === 'female-swat') {
      const elbow = handPose.leftElbow;
      this.arms
        .fillStyle(FEMALE_VISUAL_COLORS.skin, 1)
        .fillCircle(elbow.x, elbow.y, armWidth / 2);
    }
    this.drawFemaleShoulderCaps(
      this.arms,
      leftShoulderY,
      rightShoulderY,
      armOutlineWidth,
      armWidth,
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
    const leftShoulderY = this.appearance === 'female-swat'
      ? -8
      : -HUMANOID_VISUAL.shoulderY;
    const rightShoulderY = this.appearance === 'female-swat'
      ? 9
      : HUMANOID_VISUAL.shoulderY;
    const armOutlineWidth = this.appearance === 'female-swat' ? 6 : 9;
    const armWidth = this.appearance === 'female-swat' ? 5 : 6;

    this.arms.clear();
    this.rifleUnderArm.clear();
    this.drawArmPathOn(
      this.rifleUnderArm,
      armOutlineWidth,
      0x05080b,
      rightElbow,
      rightHand,
      rightShoulderY,
    );
    this.drawArmPathOn(
      this.rifleUnderArm,
      armWidth,
      this.armColor('lower'),
      rightElbow,
      rightHand,
      rightShoulderY,
    );
    this.rifleUnderArm.fillStyle(0x05080b, 1);
    this.rifleUnderArm.fillCircle(rightHand.x, rightHand.y, 3.5);
    this.drawArmPathOn(
      this.rifleUnderArm,
      armOutlineWidth,
      0x05080b,
      leftElbow,
      leftHand,
      leftShoulderY,
    );
    this.drawArmPathOn(
      this.rifleUnderArm,
      armWidth,
      this.armColor('upper'),
      leftElbow,
      leftHand,
      leftShoulderY,
    );
    this.drawFemaleShoulderCaps(
      this.rifleUnderArm,
      leftShoulderY,
      rightShoulderY,
      armOutlineWidth,
      armWidth,
    );
    this.rifleUnderArm.fillStyle(0x05080b, 1);
    this.rifleUnderArm.fillCircle(leftHand.x, leftHand.y, 3.5);
  }

  private applyMuzzleReflection(): void {
    this.drawSidearm();
    this.drawRifle();
    this.drawRifleReload();
    this.drawArms(this.currentPose);
    this.drawMaleAppearance();
    this.drawFemaleAppearance();
    this.drawMuzzleReflection(this.currentPose);
  }

  private armColor(side: 'upper' | 'lower'): number {
    if (this.appearance === 'female-swat') return FEMALE_VISUAL_COLORS.skin;
    return side === 'upper'
      ? PLAYER_VISUAL_COLORS.upperArm
      : PLAYER_VISUAL_COLORS.lowerArm;
  }

  private drawSidearm(): void {
    const reflection = this.muzzleReflectionIntensity;
    const bodyColor = blendVisualColor(
      PLAYER_VISUAL_COLORS.sidearm,
      PLAYER_VISUAL_COLORS.sidearmReflection,
      reflection * 0.7,
    );
    const slideColor = blendVisualColor(
      PLAYER_VISUAL_COLORS.sidearmSlide,
      PLAYER_VISUAL_COLORS.sidearmSlideReflection,
      reflection,
    );
    const metalColor = blendVisualColor(
      PLAYER_VISUAL_COLORS.sidearmMetal,
      PLAYER_VISUAL_COLORS.sidearmMetalReflection,
      reflection,
    );
    const halfLength = SIDEARM_VISUAL.length / 2;

    this.sidearm
      .clear()
      // Dark border and muzzle retain the reference pistol's compact silhouette.
      .fillStyle(0x090b0e, 1)
      .fillRoundedRect(
        -halfLength - 1,
        -SIDEARM_VISUAL.width / 2 - 1,
        SIDEARM_VISUAL.length + 2,
        SIDEARM_VISUAL.width + 2,
        1.4,
      )
      .fillStyle(slideColor, 1)
      .fillRoundedRect(
        -halfLength,
        -SIDEARM_VISUAL.width / 2,
        SIDEARM_VISUAL.length,
        SIDEARM_VISUAL.width,
        0.9,
      )
      // A narrow metal inset reads at game scale without changing weapon bounds.
      .fillStyle(metalColor, 0.95)
      .fillRoundedRect(-4.5, -1.1, 9.5, 2.2, 0.5)
      .fillStyle(bodyColor, 1)
      .fillRect(-halfLength + 1, -1.6, 3.5, 3.2)
      .fillStyle(0x080a0c, 1)
      .fillRect(halfLength - 2, -SIDEARM_VISUAL.width / 2, 2, SIDEARM_VISUAL.width)
      // Offset sights echo the small notches visible on the reference weapon.
      .fillRect(-halfLength + 1, -SIDEARM_VISUAL.width / 2 - 1.6, 2, 1.6)
      .fillRect(halfLength - 3, -SIDEARM_VISUAL.width / 2 - 1.2, 1.5, 1.2);
  }

  private drawFemaleShoulderCaps(
    graphics: Phaser.GameObjects.Graphics,
    leftShoulderY: number,
    rightShoulderY: number,
    outlineWidth: number,
    armWidth: number,
  ): void {
    if (this.appearance !== 'female-swat') return;

    const outlineRadius = outlineWidth / 2;
    const armRadius = armWidth / 2;
    graphics
      .fillStyle(0x05080b, 1)
      .fillCircle(2, leftShoulderY, outlineRadius)
      .fillCircle(2, rightShoulderY, outlineRadius)
      .fillStyle(FEMALE_VISUAL_COLORS.skin, 1)
      .fillCircle(2, leftShoulderY, armRadius)
      .fillCircle(2, rightShoulderY, armRadius);
  }

  private updateFemaleMovement(deltaMs: number, isMoving: boolean): void {
    if (!this.ponytail) return;

    const safeDeltaMs = Number.isFinite(deltaMs) ? Math.max(0, deltaMs) : 0;
    const targetMovement = isMoving ? 1 : 0;
    const movementBlend = 1 - Math.exp(-safeDeltaMs * 0.012);
    this.movementAmount += (targetMovement - this.movementAmount) * movementBlend;
    this.ponytailSwayTimeMs += safeDeltaMs * this.movementAmount;

    const angleDifference = Phaser.Math.Angle.Wrap(
      this.rotation - this.ponytailWorldRotation,
    );
    const followBlend = 1 - Math.exp(-safeDeltaMs / 1000 * PONYTAIL_FOLLOW_RATE);
    this.ponytailWorldRotation = Phaser.Math.Angle.Wrap(
      this.ponytailWorldRotation + angleDifference * followBlend,
    );
    const relativeLag = clampPonytailRelativeRotation(
      this.rotation,
      this.ponytailWorldRotation,
      PONYTAIL_MAX_LAG_RADIANS,
    );
    this.ponytailWorldRotation = Phaser.Math.Angle.Wrap(
      this.rotation + relativeLag,
    );
    const sway = Math.sin(this.ponytailSwayTimeMs * PONYTAIL_SWAY_SPEED)
      * 0.045
      * this.movementAmount;
    const shotSway = this.ponytailShotSwayDirection
      * this.ponytailShotSwayIntensity
      * PONYTAIL_SHOT_SWAY_RADIANS;
    this.ponytail.setRotation(
      relativeLag + sway + shotSway,
    );
  }

  private drawMaleAppearance(): void {
    if (this.appearance !== 'male-swat') return;

    const torsoColor = blendVisualColor(
      PLAYER_VISUAL_COLORS.torso,
      PLAYER_VISUAL_COLORS.torsoReflection,
      this.muzzleReflectionIntensity * 0.45,
    );
    const headColor = blendVisualColor(
      PLAYER_VISUAL_COLORS.head,
      PLAYER_VISUAL_COLORS.headReflection,
      this.muzzleReflectionIntensity * 0.55,
    );

    this.torso
      .clear()
      // The vest wraps around both sides of the helmet and extends rearward.
      .fillStyle(HUMANOID_VISUAL.outlineColor, 1)
      .fillRoundedRect(-14, -17, 27, 34, 8)
      .fillRoundedRect(-20, -12, 12, 24, 6)
      .fillStyle(torsoColor, 1)
      .fillRoundedRect(-12, -14, 23, 28, 6)
      .fillStyle(0x080b0f, 1)
      .fillRoundedRect(-18, -10, 10, 20, 5)
      .fillStyle(0x394755, 0.7)
      .fillRect(-8, -13, 1.5, 26);

    this.torso
      .fillStyle(HUMANOID_VISUAL.outlineColor, 1)
      .fillCircle(
        HUMANOID_VISUAL.shoulderX,
        -HUMANOID_VISUAL.shoulderY,
        HUMANOID_VISUAL.outlineWidth / 2,
      )
      .fillCircle(
        HUMANOID_VISUAL.shoulderX,
        HUMANOID_VISUAL.shoulderY,
        HUMANOID_VISUAL.outlineWidth / 2,
      )
      .fillStyle(PLAYER_VISUAL_COLORS.upperArm, 1)
      .fillCircle(
        HUMANOID_VISUAL.shoulderX,
        -HUMANOID_VISUAL.shoulderY,
        HUMANOID_VISUAL.armWidth / 2,
      )
      .fillStyle(PLAYER_VISUAL_COLORS.lowerArm, 1)
      .fillCircle(
        HUMANOID_VISUAL.shoulderX,
        HUMANOID_VISUAL.shoulderY,
        HUMANOID_VISUAL.armWidth / 2,
      );

    this.head
      .clear()
      .fillStyle(HUMANOID_VISUAL.outlineColor, 1)
      .fillEllipse(0, 0, HUMANOID_VISUAL.headWidth, HUMANOID_VISUAL.headHeight)
      .fillStyle(headColor, 1)
      .fillEllipse(1, 0, 20, 21)
      .fillStyle(0x394550, 0.45)
      .fillEllipse(4, -3, 7, 12);
  }

  private drawFemaleAppearance(): void {
    if (!this.femaleBody || !this.femaleHead || !this.ponytail) return;

    const stride = Math.sin(this.ponytailSwayTimeMs * PONYTAIL_SWAY_SPEED)
      * this.movementAmount;
    this.ponytail
      .clear()
      .fillStyle(0x120c0b, 0.8)
      .fillEllipse(-15, 0, 22, 13)
      .fillStyle(FEMALE_VISUAL_COLORS.hair, 1)
      .fillEllipse(-14, -2, 19, 9)
      .fillEllipse(-21, 1, 14, 8)
      .fillStyle(FEMALE_VISUAL_COLORS.hairHighlight, 0.72)
      .fillEllipse(-17, -3, 13, 3);

    this.femaleBody
      .clear()
      // Short thigh hints stay within the unchanged collision radius.
      .fillStyle(FEMALE_VISUAL_COLORS.skin, 1)
      .fillEllipse(-9 + stride, -7, 12, 7)
      .fillEllipse(-9 - stride, 7, 12, 7)
      // One-sided holster: local lower side only.
      .fillStyle(FEMALE_VISUAL_COLORS.equipment, 1)
      .fillRoundedRect(-15 - stride, 7, 10, 6, 2)
      .fillStyle(FEMALE_VISUAL_COLORS.equipmentHighlight, 1)
      .fillRect(-12 - stride, 8, 5, 1)
      // Dark lower body, distinct from the tactical top.
      .fillStyle(0x07090c, 1)
      .fillEllipse(-5, 0, 27, 24)
      .fillStyle(FEMALE_VISUAL_COLORS.bottom, 1)
      .fillEllipse(-4, 0, 24, 21)
      // A short curved waist glimpse avoids a straight cut across the torso.
      .fillStyle(FEMALE_VISUAL_COLORS.skin, 1)
      .fillEllipse(0, 0, 8, 17)
      // Tapered torso: narrower waist, shoulders about 10% narrower than male.
      .fillStyle(0x05080b, 1)
      .fillTriangle(-2, -14, -2, 14, 14, 10)
      .fillTriangle(-2, -14, 14, -10, 14, 10)
      .fillStyle(FEMALE_VISUAL_COLORS.top, 1)
      .fillTriangle(-1, -12, -1, 12, 13, 8.5)
      .fillTriangle(-1, -12, 13, -8.5, 13, 8.5);

    // The head covers the shoulder roots, while arms remain below the weapon.
    this.femaleHead
      .clear()
      .fillStyle(0x120c0b, 1)
      .fillCircle(-2, 0, PLAYER_RADIUS * 0.68)
      .fillStyle(FEMALE_VISUAL_COLORS.hair, 1)
      .fillEllipse(-2, 0, PLAYER_RADIUS * 1.13, PLAYER_RADIUS * 1.2)
      .fillStyle(FEMALE_VISUAL_COLORS.hairHighlight, 0.75)
      .fillEllipse(0, -4, 8, 5);
  }

  private drawMuzzleReflection(pose: SidearmPose): void {
    const intensity = this.muzzleReflectionIntensity;
    this.muzzleReflection.clear().setVisible(intensity > 0.001);
    if (intensity <= 0.001) return;

    if (this.appearance === 'female-swat') {
      this.drawFemaleMuzzleReflection(pose, intensity);
      return;
    }

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

  private drawFemaleMuzzleReflection(
    pose: SidearmPose,
    intensity: number,
  ): void {
    // Keep the reflection inside the female torso and hair silhouettes.
    this.muzzleReflection
      .fillStyle(FEMALE_VISUAL_COLORS.topReflection, intensity * 0.5)
      .fillTriangle(2, -8, 2, 8, 12, 6)
      .fillTriangle(2, -8, 12, -6, 12, 6)
      .fillStyle(FEMALE_VISUAL_COLORS.hairReflection, intensity * 0.58)
      .fillEllipse(2, 0, 6, 12);

    const gripX = pose.x - Math.cos(pose.rotation) * this.weaponLength() / 2;
    const gripY = pose.y - Math.sin(pose.rotation) * SIDEARM_VISUAL.length / 2;
    this.muzzleReflection
      .lineStyle(2, FEMALE_VISUAL_COLORS.skinReflection, intensity * 0.72)
      .beginPath()
      .moveTo(gripX * 0.58, gripY + 7)
      .lineTo(gripX, gripY + 2)
      .strokePath()
      .lineStyle(2, FEMALE_VISUAL_COLORS.skinReflection, intensity * 0.66)
      .beginPath()
      .moveTo(gripX * 0.55, gripY - 8)
      .lineTo(gripX, gripY - 2)
      .strokePath();
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
