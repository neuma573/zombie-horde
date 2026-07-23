import Phaser from 'phaser';

import {
  ZOMBIE_DEATH_EFFECT_CONFIG,
  ZOMBIE_HIT_EFFECT_CONFIG,
} from '../config/hitFeedbackConfig';
import type { ImpactEffectEvent, ShotEffectEvent } from '../logic/combatEffects';
import {
  resolveHumanoidDeathPose,
  type HumanoidPartTransform,
} from '../logic/humanoidDeathPose';

const EFFECT_DEPTH = 50;

export class CombatEffects {
  private readonly active = new Set<Phaser.GameObjects.GameObject>();

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly enabled = true,
  ) {}

  playShot(event: ShotEffectEvent): void {
    if (!this.enabled) {
      return;
    }

    const tracer = this.scene.add.graphics().setDepth(EFFECT_DEPTH);
    tracer.lineStyle(2, 0xffe08a, 0.9);
    tracer.beginPath();
    tracer.moveTo(event.origin.x, event.origin.y);
    tracer.lineTo(event.endPoint.x, event.endPoint.y);
    tracer.strokePath();
    this.fadeAndDestroy(tracer, 90);

    const muzzle = this.scene.add.circle(
      event.origin.x,
      event.origin.y,
      6,
      0xfff1a8,
      0.95,
    ).setDepth(EFFECT_DEPTH);
    this.fadeAndDestroy(muzzle, 70, { scale: 1.8 });
  }

  playZombieHit(event: ImpactEffectEvent): void {
    if (!this.enabled) {
      return;
    }

    const directionLength = Math.hypot(event.direction?.x ?? 0, event.direction?.y ?? 0);
    const direction = directionLength > 1e-9
      ? {
        x: (event.direction?.x ?? 0) / directionLength,
        y: (event.direction?.y ?? 0) / directionLength,
      }
      : { x: 1, y: 0 };
    const perpendicular = { x: -direction.y, y: direction.x };
    const impact = this.scene.add.circle(
      event.position.x,
      event.position.y,
      3.2,
      0xffc8aa,
      0.9,
    ).setDepth(EFFECT_DEPTH);
    this.fadeAndDestroy(impact, ZOMBIE_HIT_EFFECT_CONFIG.burstDurationMs, { scale: 0.35 });

    const lateralOffsets = [-0.14, 0.05, 0.22];
    const distanceRatios = [0.72, 1, 0.8];
    const radii = [1.25, 1.8, 1.05];
    for (let index = 0; index < ZOMBIE_HIT_EFFECT_CONFIG.particleCount; index += 1) {
      const lateral = lateralOffsets[index] ?? 0;
      const particleDirection = {
        x: direction.x + perpendicular.x * lateral,
        y: direction.y + perpendicular.y * lateral,
      };
      const particleLength = Math.hypot(particleDirection.x, particleDirection.y);
      const distance = ZOMBIE_HIT_EFFECT_CONFIG.particleDistance
        * (distanceRatios[index] ?? 1);
      const particle = this.scene.add.circle(
        event.position.x + perpendicular.x * lateral * 4,
        event.position.y + perpendicular.y * lateral * 4,
        radii[index] ?? 1.2,
        index === 1 ? 0x8f2027 : 0x65171c,
        0.82,
      ).setDepth(EFFECT_DEPTH);
      this.fadeAndDestroy(
        particle,
        ZOMBIE_HIT_EFFECT_CONFIG.particleDurationMs,
        {
          x: particle.x + particleDirection.x / particleLength * distance,
          y: particle.y + particleDirection.y / particleLength * distance,
          scale: 0.45,
        },
      );
    }
  }

  playZombieDeath(event: ImpactEffectEvent): void {
    if (!this.enabled) {
      return;
    }

    const directionLength = Math.hypot(event.direction?.x ?? 0, event.direction?.y ?? 0);
    const direction = directionLength > 1e-9
      ? {
        x: (event.direction?.x ?? 0) / directionLength,
        y: (event.direction?.y ?? 0) / directionLength,
      }
      : { x: 1, y: 0 };
    const corpse = this.createZombieCorpse(event.radius);
    corpse.container
      .setPosition(event.position.x, event.position.y)
      .setRotation(Number.isFinite(event.rotation) ? event.rotation! : 0)
      .setDepth(EFFECT_DEPTH - 1);
    const localImpactY = direction.x * Math.sin(-corpse.container.rotation)
      + direction.y * Math.cos(-corpse.container.rotation);
    const fallSide = localImpactY >= 0 ? 1 : -1;
    const pose = resolveHumanoidDeathPose(
      event.variantKey ?? `${event.position.x}:${event.position.y}`,
      fallSide,
    );
    const bloodPool = this.createBloodPool(event.radius)
      .setPosition(
        event.position.x + direction.x * 2,
        event.position.y + direction.y * 2,
      )
      .setRotation(corpse.container.rotation + fallSide * 0.18)
      .setScale(0.24)
      .setAlpha(0)
      .setDepth(EFFECT_DEPTH - 2);
    this.active.add(corpse.container);
    this.active.add(bloodPool);
    this.scene.tweens.add({
      targets: bloodPool,
      scaleX: 1,
      scaleY: 1,
      alpha: ZOMBIE_DEATH_EFFECT_CONFIG.bloodPoolAlpha,
      duration: ZOMBIE_DEATH_EFFECT_CONFIG.bloodPoolGrowDurationMs,
      ease: 'Sine.Out',
    });
    this.scene.tweens.add({
      targets: corpse.container,
      x: corpse.container.x + direction.x * ZOMBIE_DEATH_EFFECT_CONFIG.driftDistance,
      y: corpse.container.y + direction.y * ZOMBIE_DEATH_EFFECT_CONFIG.driftDistance,
      rotation: corpse.container.rotation
        + fallSide * ZOMBIE_DEATH_EFFECT_CONFIG.fallRotationRadians,
      duration: ZOMBIE_DEATH_EFFECT_CONFIG.fallDurationMs,
      ease: 'Sine.Out',
    });
    this.tweenCorpsePart(corpse.head, pose.head);
    this.tweenCorpsePart(corpse.torso, pose.torso);
    this.tweenCorpsePart(corpse.upperArm, pose.upperArm);
    this.tweenCorpsePart(corpse.lowerArm, pose.lowerArm);
    this.tweenCorpsePart(corpse.upperLeg, pose.upperLeg);
    this.tweenCorpsePart(corpse.lowerLeg, pose.lowerLeg);
    this.scene.tweens.add({
      targets: corpse.container,
      alpha: 0,
      delay: ZOMBIE_DEATH_EFFECT_CONFIG.fallDurationMs
        + ZOMBIE_DEATH_EFFECT_CONFIG.restDurationMs,
      duration: ZOMBIE_DEATH_EFFECT_CONFIG.fadeDurationMs,
      ease: 'Linear',
      onComplete: () => {
        this.active.delete(corpse.container);
        corpse.container.destroy();
      },
    });
    this.scene.tweens.add({
      targets: bloodPool,
      alpha: 0,
      delay: ZOMBIE_DEATH_EFFECT_CONFIG.fallDurationMs
        + ZOMBIE_DEATH_EFFECT_CONFIG.restDurationMs,
      duration: ZOMBIE_DEATH_EFFECT_CONFIG.fadeDurationMs,
      ease: 'Linear',
      onComplete: () => {
        this.active.delete(bloodPool);
        bloodPool.destroy();
      },
    });
  }

  playPlayerHit(event: ImpactEffectEvent): void {
    if (!this.enabled) {
      return;
    }

    const flash = this.scene.add.circle(
      event.position.x,
      event.position.y,
      event.radius,
      0xff4d4d,
      0.65,
    ).setDepth(EFFECT_DEPTH);
    this.fadeAndDestroy(flash, 140, { scale: 1.35 });
  }

  destroy(): void {
    for (const effect of this.active) {
      effect.destroy();
    }
    this.active.clear();
  }

  private createZombieCorpse(radius: number): {
    container: Phaser.GameObjects.Container;
    head: Phaser.GameObjects.Graphics;
    torso: Phaser.GameObjects.Graphics;
    upperArm: Phaser.GameObjects.Graphics;
    lowerArm: Phaser.GameObjects.Graphics;
    upperLeg: Phaser.GameObjects.Graphics;
    lowerLeg: Phaser.GameObjects.Graphics;
  } {
    const safeRadius = Number.isFinite(radius) ? Math.max(1, radius) : 20;
    const shadow = this.scene.add.graphics();
    shadow.fillStyle(0x000000, 0.32);
    shadow.fillEllipse(0, 4, safeRadius * 2.15, safeRadius * 1.45);
    const torso = this.scene.add.graphics();
    torso.fillStyle(0x263026, 1);
    torso.fillEllipse(0, 0, safeRadius * 1.9, safeRadius * 1.35);
    torso.lineStyle(3, 0x121713, 1);
    torso.strokeEllipse(0, 0, safeRadius * 1.9, safeRadius * 1.35);
    const head = this.scene.add.graphics();
    head.fillStyle(0x596451, 1);
    head.fillCircle(-2, 0, safeRadius * 0.58);
    head.lineStyle(2, 0x121713, 1);
    head.strokeCircle(-2, 0, safeRadius * 0.58);
    const upperArm = this.createCorpseArm(0x53604e);
    upperArm.setPosition(0, -10);
    const lowerArm = this.createCorpseArm(0x606c58);
    lowerArm.setPosition(0, 10);
    const upperLeg = this.createCorpseLeg(0x202820);
    upperLeg.setPosition(-9, -6);
    const lowerLeg = this.createCorpseLeg(0x252d24);
    lowerLeg.setPosition(-9, 6);
    const container = this.scene.add.container(0, 0, [
      shadow,
      upperLeg,
      lowerLeg,
      upperArm,
      lowerArm,
      torso,
      head,
    ]);

    return { container, head, torso, upperArm, lowerArm, upperLeg, lowerLeg };
  }

  private createBloodPool(radius: number): Phaser.GameObjects.Container {
    const safeRadius = Number.isFinite(radius) ? Math.max(1, radius) : 20;
    const main = this.scene.add.ellipse(
      0,
      0,
      safeRadius * 2.05,
      safeRadius * 1.05,
      0x4b0d13,
      1,
    );
    const forwardLobe = this.scene.add.ellipse(
      safeRadius * 0.62,
      -safeRadius * 0.12,
      safeRadius * 0.86,
      safeRadius * 0.58,
      0x5a1017,
      0.92,
    );
    const sideLobe = this.scene.add.ellipse(
      -safeRadius * 0.48,
      safeRadius * 0.3,
      safeRadius * 0.72,
      safeRadius * 0.5,
      0x3c0a0f,
      0.9,
    );
    return this.scene.add.container(0, 0, [main, forwardLobe, sideLobe]);
  }

  private createCorpseArm(color: number): Phaser.GameObjects.Graphics {
    const arm = this.scene.add.graphics();
    arm.lineStyle(8, 0x121713, 1);
    arm.beginPath();
    arm.moveTo(0, 0);
    arm.lineTo(11, -3);
    arm.lineTo(22, 0);
    arm.strokePath();
    arm.lineStyle(5, color, 1);
    arm.beginPath();
    arm.moveTo(0, 0);
    arm.lineTo(11, -3);
    arm.lineTo(22, 0);
    arm.strokePath();
    return arm;
  }

  private createCorpseLeg(color: number): Phaser.GameObjects.Graphics {
    const leg = this.scene.add.graphics();
    leg.lineStyle(13, 0x111511, 1);
    leg.beginPath();
    leg.moveTo(0, 0);
    leg.lineTo(-12, 0);
    leg.lineTo(-25, 2);
    leg.strokePath();
    leg.lineStyle(9, color, 1);
    leg.beginPath();
    leg.moveTo(0, 0);
    leg.lineTo(-12, 0);
    leg.lineTo(-25, 2);
    leg.strokePath();
    leg.fillStyle(0x101410, 1);
    leg.fillEllipse(-28, 2, 10, 7);
    return leg;
  }

  private tweenCorpsePart(
    part: Phaser.GameObjects.Graphics,
    transform: HumanoidPartTransform,
  ): void {
    this.scene.tweens.add({
      targets: part,
      x: transform.x,
      y: transform.y,
      rotation: transform.rotation,
      scaleX: transform.scaleX,
      duration: ZOMBIE_DEATH_EFFECT_CONFIG.fallDurationMs,
      ease: 'Sine.Out',
    });
  }

  private fadeAndDestroy(
    effect: Phaser.GameObjects.GameObject,
    duration: number,
    extra: { scale?: number; x?: number; y?: number } = {},
  ): void {
    this.active.add(effect);
    this.scene.tweens.add({
      targets: effect,
      alpha: 0,
      duration,
      ease: 'Linear',
      ...(extra.scale === undefined ? {} : { scale: extra.scale }),
      ...(extra.x === undefined ? {} : { x: extra.x }),
      ...(extra.y === undefined ? {} : { y: extra.y }),
      onComplete: () => {
        this.active.delete(effect);
        effect.destroy();
      },
    });
  }
}
