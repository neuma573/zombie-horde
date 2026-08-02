import Phaser from 'phaser';

import { HUMANOID_VISUAL } from '../config/characterVisualConfig';
import { ZOMBIE_CONFIG } from '../config/zombieConfig';
import { ZOMBIE_HIT_REACTION_CONFIG } from '../config/hitFeedbackConfig';
import type { Vector2 } from '../logic/hitscan';
import {
  advanceZombieHitReaction,
  createZombieHitReaction,
  resolveZombieHitReactionPose,
  type ZombieHitReactionState,
} from '../logic/zombieHitFeedback';
import { resolveZombieAttackPose } from '../logic/zombieVisual';
import { decayTransientLight } from '../logic/timeBasedLighting';
import { facingRotation } from '../logic/characterVisual';
import {
  createZombieAppearance,
  zombieAppearanceSeedFromId,
  type ZombieAppearance,
} from '../logic/zombieAppearance';

const MUZZLE_REFLECTION_DECAY_RATE = 22;

function drawZombieArm(
  graphics: Phaser.GameObjects.Graphics,
  shoulderY: number,
  elbowX: number,
  elbowY: number,
  handY: number,
  handX: number,
  color: number,
  width: number,
): void {
  graphics.lineStyle(width, color, 1);
  graphics.beginPath();
  graphics.moveTo(HUMANOID_VISUAL.shoulderX, shoulderY);
  graphics.lineTo(elbowX, elbowY);
  graphics.lineTo(handX, handY);
  graphics.strokePath();
}

export class Zombie extends Phaser.GameObjects.Container {
  health: number;
  readonly hitRadius = ZOMBIE_CONFIG.radius;
  attackCooldownRemainingMs = 0;
  attackWindupRemainingMs: number | null = null;
  private readonly upperArm: Phaser.GameObjects.Graphics;
  private readonly lowerArm: Phaser.GameObjects.Graphics;
  private readonly hairBack: Phaser.GameObjects.Graphics;
  private readonly torso: Phaser.GameObjects.Graphics;
  private readonly head: Phaser.GameObjects.Graphics;
  private readonly hairFront: Phaser.GameObjects.Graphics;
  private readonly muzzleReflection: Phaser.GameObjects.Graphics;
  private muzzleReflectionIntensity = 0;
  private hitReaction: ZombieHitReactionState | null = null;

  constructor(
    scene: Phaser.Scene,
    readonly id: string,
    x: number,
    y: number,
    readonly appearance: ZombieAppearance = createZombieAppearance(
      zombieAppearanceSeedFromId(id),
      0,
    ),
    health: number = ZOMBIE_CONFIG.health,
    readonly kind: 'normal' | 'fast' = 'normal',
  ) {
    const shadow = new Phaser.GameObjects.Ellipse(
      scene,
      HUMANOID_VISUAL.shadow.offsetX,
      HUMANOID_VISUAL.shadow.offsetY,
      ZOMBIE_CONFIG.radius * HUMANOID_VISUAL.shadow.widthRadiusScale,
      ZOMBIE_CONFIG.radius * HUMANOID_VISUAL.shadow.heightRadiusScale,
      HUMANOID_VISUAL.shadow.color,
      HUMANOID_VISUAL.shadow.alpha,
    );
    const upperArm = new Phaser.GameObjects.Graphics(scene);
    const lowerArm = new Phaser.GameObjects.Graphics(scene);
    const hairBack = new Phaser.GameObjects.Graphics(scene);
    const torso = new Phaser.GameObjects.Graphics(scene);
    const head = new Phaser.GameObjects.Graphics(scene);
    const hairFront = new Phaser.GameObjects.Graphics(scene);
    const muzzleReflection = new Phaser.GameObjects.Graphics(scene);

    super(scene, x, y, [
      shadow,
      hairBack,
      upperArm,
      torso,
      head,
      hairFront,
      lowerArm,
      muzzleReflection,
    ]);
    this.upperArm = upperArm;
    this.lowerArm = lowerArm;
    this.hairBack = hairBack;
    this.torso = torso;
    this.head = head;
    this.hairFront = hairFront;
    this.muzzleReflection = muzzleReflection;
    this.health = Math.max(1, health);

    scene.add.existing(this);
    this.drawStaticAppearance();
    this.updateAttackVisual();
  }

  faceToward(target: { x: number; y: number }): void {
    const offsetX = target.x - this.x;
    const offsetY = target.y - this.y;

    if (offsetX !== 0 || offsetY !== 0) {
      this.setRotation(facingRotation({ x: offsetX, y: offsetY }, this.rotation));
      this.updateArmDepth();
    }
  }

  updateAttackVisual(): void {
    this.updateArmDepth();
    this.drawVisual(resolveZombieAttackPose(
      this.attackWindupRemainingMs,
      this.attackCooldownRemainingMs,
      ZOMBIE_CONFIG.attackWindupMs,
      ZOMBIE_CONFIG.attackIntervalMs - ZOMBIE_CONFIG.attackWindupMs,
    ));
  }

  triggerMuzzleReflection(intensity: number): void {
    this.muzzleReflectionIntensity = Math.max(this.muzzleReflectionIntensity, intensity);
    this.updateAttackVisual();
  }

  triggerHitReaction(direction: Vector2): void {
    this.hitReaction = createZombieHitReaction(
      direction,
      this.rotation,
      ZOMBIE_HIT_REACTION_CONFIG,
    );
    this.updateAttackVisual();
  }

  updateMuzzleReflection(deltaMs: number): void {
    this.muzzleReflectionIntensity = decayTransientLight(
      this.muzzleReflectionIntensity,
      deltaMs,
      MUZZLE_REFLECTION_DECAY_RATE,
    );
    this.hitReaction = advanceZombieHitReaction(this.hitReaction, deltaMs);
  }

  private drawVisual(resolvedPose: ReturnType<typeof resolveZombieAttackPose>): void {
    const hitPose = resolveZombieHitReactionPose(
      this.hitReaction,
      ZOMBIE_HIT_REACTION_CONFIG,
    );
    for (const part of [
      this.upperArm,
      this.lowerArm,
      this.hairBack,
      this.torso,
      this.head,
      this.hairFront,
      this.muzzleReflection,
    ]) {
      part.setPosition(hitPose.offset.x, hitPose.offset.y);
      part.setRotation(hitPose.rotation);
    }
    this.upperArm.clear();
    this.lowerArm.clear();
    this.muzzleReflection.clear();

    const posture = this.appearance.posture;
    const upperElbow = this.shortenArmPoint(
      -HUMANOID_VISUAL.shoulderY,
      resolvedPose.upperElbowX + posture.upperElbowX
        + hitPose.upperArmOffset.x * 0.55,
      resolvedPose.upperElbowY + posture.upperElbowY
        + hitPose.upperArmOffset.y * 0.55,
    );
    const upperHand = this.shortenArmPoint(
      -HUMANOID_VISUAL.shoulderY,
      resolvedPose.upperHandX + posture.upperHandX + hitPose.upperArmOffset.x,
      resolvedPose.upperHandY + posture.upperHandY + hitPose.upperArmOffset.y,
    );
    const lowerElbow = this.shortenArmPoint(
      HUMANOID_VISUAL.shoulderY,
      resolvedPose.lowerElbowX + posture.lowerElbowX
        + hitPose.lowerArmOffset.x * 0.55,
      resolvedPose.lowerElbowY + posture.lowerElbowY
        + hitPose.lowerArmOffset.y * 0.55,
    );
    const lowerHand = this.shortenArmPoint(
      HUMANOID_VISUAL.shoulderY,
      resolvedPose.lowerHandX + posture.lowerHandX + hitPose.lowerArmOffset.x,
      resolvedPose.lowerHandY + posture.lowerHandY + hitPose.lowerArmOffset.y,
    );

    this.drawArm(
      this.upperArm,
      -HUMANOID_VISUAL.shoulderY,
      upperElbow.x,
      upperElbow.y,
      upperHand.x,
      upperHand.y,
    );
    this.drawArm(
      this.lowerArm,
      HUMANOID_VISUAL.shoulderY,
      lowerElbow.x,
      lowerElbow.y,
      lowerHand.x,
      lowerHand.y,
    );

    if (this.muzzleReflectionIntensity > 0.001) {
      const alpha = this.muzzleReflectionIntensity;
      // Zombies face the player, so the muzzle-facing surface is their local front.
      this.muzzleReflection.fillStyle(0xd6c99b, alpha * 0.36);
      this.muzzleReflection.fillEllipse(5, 0, 10, 23);
      this.muzzleReflection.fillStyle(0xf0ddb0, alpha * 0.52);
      this.muzzleReflection.fillEllipse(6, 0, 6, 13);
    }
  }

  private drawStaticAppearance(): void {
    this.hairBack.clear();
    this.torso.clear();
    this.head.clear();
    this.hairFront.clear();
    this.drawTorso();
    this.drawHead();
    this.drawHair();
  }

  private drawTorso(): void {
    const bodyScale = this.appearance.bodyType === 'slim'
      ? 0.88
      : this.appearance.bodyType === 'broad' ? 1.1 : 1;
    const halfHeight = HUMANOID_VISUAL.torsoHeight * bodyScale / 2;
    const torsoWidth = HUMANOID_VISUAL.torsoWidth
      + (this.appearance.bodyType === 'broad' ? 2 : 0);

    this.torso
      .fillStyle(HUMANOID_VISUAL.outlineColor, 1)
      .fillRoundedRect(-15, -halfHeight, torsoWidth, halfHeight * 2, 8)
      // The uneven rear hem keeps the silhouette from looking manufactured.
      .fillRoundedRect(
        -20,
        this.appearance.tornSide === 'upper' ? -10 : -8,
        9,
        this.appearance.tornSide === 'upper' ? 17 : 19,
        4,
      )
      .fillStyle(this.appearance.clothing.base, 1)
      .fillRoundedRect(-13, -halfHeight + 3, torsoWidth - 4, halfHeight * 2 - 6, 6);

    switch (this.appearance.archetype) {
      case 'casualMale':
        this.torso
          .fillStyle(this.appearance.clothing.detail, 0.75)
          .fillRect(-8, -halfHeight + 5, 2, halfHeight * 2 - 10);
        break;
      case 'casualFemale':
        this.torso
          .fillStyle(this.appearance.clothing.detail, 0.72)
          .fillTriangle(-10, -halfHeight + 4, -10, halfHeight - 4, 7, 0)
          .fillStyle(this.appearance.clothing.base, 1)
          .fillTriangle(-7, -halfHeight + 6, -7, halfHeight - 6, 8, 0);
        break;
      case 'office':
        this.torso
          .fillStyle(this.appearance.clothing.detail, 0.9)
          .fillTriangle(7, -6, 7, 0, 1, -4)
          .fillTriangle(7, 6, 7, 0, 1, 4)
          .fillStyle(0x343a3d, 0.8)
          .fillRect(-7, -1, 15, 2);
        break;
      case 'worker':
        this.torso
          .fillStyle(this.appearance.clothing.detail, 0.85)
          .fillRect(-7, -halfHeight + 4, 4, halfHeight * 2 - 8)
          .fillRect(-11, -halfHeight + 7, 18, 3);
        break;
      case 'athletic':
        this.torso
          .fillStyle(this.appearance.clothing.detail, 0.9)
          .fillRect(-10, -halfHeight + 4, 3, halfHeight * 2 - 8)
          .fillRect(3, -halfHeight + 5, 3, halfHeight * 2 - 10);
        break;
      case 'medical':
        this.torso
          .fillStyle(this.appearance.clothing.detail, 0.82)
          .fillTriangle(7, -5, 7, 5, 1, 0)
          .lineStyle(1.5, this.appearance.clothing.detail, 0.9)
          .strokeRoundedRect(-8, 5, 7, 6, 1);
        break;
    }
  }

  private shortenArmPoint(
    shoulderY: number,
    x: number,
    y: number,
  ): { x: number; y: number } {
    return {
      x: HUMANOID_VISUAL.shoulderX
        + (x - HUMANOID_VISUAL.shoulderX) * HUMANOID_VISUAL.armLengthScale,
      y: shoulderY + (y - shoulderY) * HUMANOID_VISUAL.armLengthScale,
    };
  }

  private drawHead(): void {
    const skin = this.appearance.skin;
    this.head
      .fillStyle(HUMANOID_VISUAL.outlineColor, 1)
      .fillEllipse(2, 0, HUMANOID_VISUAL.headWidth, HUMANOID_VISUAL.headHeight)
      .fillStyle(skin.base, 1)
      .fillEllipse(3, 0.5, 20, 21)
      // A restrained, off-centre temple plane gives the head an unhealthy asymmetry.
      .fillStyle(skin.highlight, 0.38)
      .fillEllipse(6, -3, 7, 11)
      .fillStyle(skin.shadow, 0.75)
      .fillEllipse(0, 6, 6, 3);
  }

  private drawHair(): void {
    const color = this.appearance.hairColor;
    switch (this.appearance.hair) {
      case 'bald':
        return;
      case 'cropped':
        this.hairFront
          .fillStyle(color.base, 1)
          .fillEllipse(-1, 0, 10, 21)
          .fillStyle(color.highlight, 0.65)
          .fillEllipse(1, -5, 4, 8);
        return;
      case 'side-part':
        this.hairFront
          .fillStyle(color.base, 1)
          .fillEllipse(0, -4, 13, 13)
          .fillStyle(color.highlight, 0.7)
          .fillEllipse(3, -6, 7, 5);
        return;
      case 'ponytail':
        this.hairBack
          .fillStyle(HUMANOID_VISUAL.outlineColor, 0.9)
          .fillEllipse(-13, 5, 17, 9)
          .fillStyle(color.base, 1)
          .fillEllipse(-13, 5, 14, 6);
        this.hairFront
          .fillStyle(color.base, 1)
          .fillEllipse(-1, 0, 10, 21)
          .fillStyle(color.highlight, 0.65)
          .fillEllipse(1, -5, 4, 8);
        return;
    }
  }

  private drawArm(
    graphics: Phaser.GameObjects.Graphics,
    shoulderY: number,
    elbowX: number,
    elbowY: number,
    handX: number,
    handY: number,
  ): void {
    drawZombieArm(
      graphics,
      shoulderY,
      elbowX,
      elbowY,
      handY,
      handX,
      HUMANOID_VISUAL.outlineColor,
      HUMANOID_VISUAL.outlineWidth,
    );
    drawZombieArm(
      graphics,
      shoulderY,
      elbowX,
      elbowY,
      handY,
      handX,
      this.appearance.sleeves === 'long'
        ? this.appearance.clothing.base
        : this.appearance.skin.base,
      HUMANOID_VISUAL.armWidth,
    );
    if (this.appearance.sleeves === 'short') {
      graphics.lineStyle(HUMANOID_VISUAL.armWidth, this.appearance.clothing.base, 1);
      graphics.beginPath();
      graphics.moveTo(HUMANOID_VISUAL.shoulderX, shoulderY);
      graphics.lineTo(elbowX, elbowY);
      graphics.strokePath();
    }
    graphics
      .fillStyle(HUMANOID_VISUAL.outlineColor, 1)
      .fillCircle(handX, handY, 3.5)
      .fillStyle(this.appearance.skin.shadow, 1)
      .fillCircle(handX, handY, 2.1);
  }

  private updateArmDepth(): void {
    const upperIsBehind = Math.cos(this.rotation) >= 0;
    const backArm = upperIsBehind ? this.upperArm : this.lowerArm;
    const frontArm = upperIsBehind ? this.lowerArm : this.upperArm;

    this.moveTo(this.hairBack, 1);
    this.moveTo(backArm, 2);
    this.moveTo(this.torso, 3);
    this.moveTo(this.head, 4);
    this.moveTo(this.hairFront, 5);
    this.moveTo(frontArm, 6);
    this.moveTo(this.muzzleReflection, 7);
  }
}
