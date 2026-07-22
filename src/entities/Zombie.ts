import Phaser from 'phaser';

import { ZOMBIE_CONFIG } from '../config/zombieConfig';
import { resolveZombieAttackPose } from '../logic/zombieVisual';
import { decayTransientLight } from '../logic/timeBasedLighting';

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
  graphics.moveTo(2, shoulderY);
  graphics.lineTo(elbowX, elbowY);
  graphics.lineTo(handX, handY);
  graphics.strokePath();
}

export class Zombie extends Phaser.GameObjects.Container {
  health = ZOMBIE_CONFIG.health;
  readonly hitRadius = ZOMBIE_CONFIG.radius;
  attackCooldownRemainingMs = 0;
  attackWindupRemainingMs: number | null = null;
  private readonly visual: Phaser.GameObjects.Graphics;
  private muzzleReflectionIntensity = 0;

  constructor(scene: Phaser.Scene, readonly id: string, x: number, y: number) {
    const visual = new Phaser.GameObjects.Graphics(scene);

    super(scene, x, y, [visual]);
    this.visual = visual;

    scene.add.existing(this);
    this.updateAttackVisual();
  }

  faceToward(target: { x: number; y: number }): void {
    const offsetX = target.x - this.x;
    const offsetY = target.y - this.y;

    if (offsetX !== 0 || offsetY !== 0) {
      this.setRotation(Math.atan2(offsetY, offsetX));
    }
  }

  updateAttackVisual(): void {
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

  updateMuzzleReflection(deltaMs: number): void {
    this.muzzleReflectionIntensity = decayTransientLight(
      this.muzzleReflectionIntensity,
      deltaMs,
      MUZZLE_REFLECTION_DECAY_RATE,
    );
    this.updateAttackVisual();
  }

  private drawVisual(resolvedPose: ReturnType<typeof resolveZombieAttackPose>): void {
    this.visual.clear();
    this.visual.fillStyle(0x000000, 0.25);
    this.visual.fillEllipse(
      -2,
      4,
      ZOMBIE_CONFIG.radius * 1.65,
      ZOMBIE_CONFIG.radius * 2.1,
    );

    drawZombieArm(this.visual, -10, resolvedPose.upperElbowX, resolvedPose.upperElbowY,
      resolvedPose.upperHandY, resolvedPose.upperHandX, 0x121713, 8);
    drawZombieArm(this.visual, 10, resolvedPose.lowerElbowX, resolvedPose.lowerElbowY,
      resolvedPose.lowerHandY, resolvedPose.lowerHandX, 0x121713, 8);
    drawZombieArm(this.visual, -10, resolvedPose.upperElbowX, resolvedPose.upperElbowY,
      resolvedPose.upperHandY, resolvedPose.upperHandX, 0x53604e, 5);
    drawZombieArm(this.visual, 10, resolvedPose.lowerElbowX, resolvedPose.lowerElbowY,
      resolvedPose.lowerHandY, resolvedPose.lowerHandX, 0x606c58, 5);

    this.visual.fillStyle(0x1a201a, 1);
    this.visual.fillCircle(resolvedPose.upperHandX, resolvedPose.upperHandY, 3.4);
    this.visual.fillCircle(resolvedPose.lowerHandX, resolvedPose.lowerHandY, 3.4);
    this.visual.fillStyle(0x354035, 1);
    this.visual.fillEllipse(
      -3,
      0,
      ZOMBIE_CONFIG.radius * 1.55,
      ZOMBIE_CONFIG.radius * 1.9,
    );
    this.visual.lineStyle(3, 0x121713, 1);
    this.visual.strokeEllipse(
      -3,
      0,
      ZOMBIE_CONFIG.radius * 1.55,
      ZOMBIE_CONFIG.radius * 1.9,
    );
    this.visual.fillStyle(0x737d69, 1);
    this.visual.fillCircle(-2, 0, ZOMBIE_CONFIG.radius * 0.62);
    this.visual.lineStyle(2, 0x121713, 1);
    this.visual.strokeCircle(-2, 0, ZOMBIE_CONFIG.radius * 0.62);

    if (this.muzzleReflectionIntensity > 0.001) {
      const alpha = this.muzzleReflectionIntensity;
      // Zombies face the player, so the muzzle-facing surface is their local front.
      this.visual.fillStyle(0xd6c99b, alpha * 0.42);
      this.visual.fillEllipse(5, 0, 10, 23);
      this.visual.fillStyle(0xf0ddb0, alpha * 0.58);
      this.visual.fillEllipse(4, 0, 6, 13);
    }
  }
}
