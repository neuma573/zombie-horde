import Phaser from 'phaser';

import { HUMANOID_VISUAL } from '../config/characterVisualConfig';
import {
  ZOMBIE_DEATH_EFFECT_CONFIG,
  ZOMBIE_HIT_EFFECT_CONFIG,
} from '../config/hitFeedbackConfig';
import { WORLD_RENDER_DEPTH } from '../config/renderDepth';
import type { ImpactEffectEvent, ShotEffectEvent } from '../logic/combatEffects';
import {
  resolveHumanoidDeathPose,
  type HumanoidPartTransform,
} from '../logic/humanoidDeathPose';
import {
  createZombieAppearance,
  type ZombieAppearance,
  type ZombieSleeves,
} from '../logic/zombieAppearance';

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

    const tracer = this.scene.add.graphics().setDepth(WORLD_RENDER_DEPTH.combatEffect);
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
    ).setDepth(WORLD_RENDER_DEPTH.combatEffect);
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
    ).setDepth(WORLD_RENDER_DEPTH.combatEffect);
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
      ).setDepth(WORLD_RENDER_DEPTH.combatEffect);
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
    const corpse = this.createZombieCorpse(event.radius, event.appearance);
    corpse.container
      .setPosition(event.position.x, event.position.y)
      .setRotation(Number.isFinite(event.rotation) ? event.rotation! : 0)
      .setDepth(WORLD_RENDER_DEPTH.zombieCorpse);
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
      .setDepth(WORLD_RENDER_DEPTH.bloodPool);
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
    ).setDepth(WORLD_RENDER_DEPTH.combatEffect);
    this.fadeAndDestroy(flash, 140, { scale: 1.35 });
  }

  playSupplyCrateHit(position: { x: number; y: number }, destroyed: boolean): void {
    if (!this.enabled) return;

    const flash = this.scene.add.circle(
      position.x,
      position.y,
      destroyed ? 8 : 4,
      destroyed ? 0xff8a4a : 0xd8c7a0,
      0.9,
    ).setDepth(WORLD_RENDER_DEPTH.combatEffect);
    this.fadeAndDestroy(flash, destroyed ? 180 : 90, {
      scale: destroyed ? 2.2 : 0.45,
    });

    if (!destroyed) return;

    for (let index = 0; index < 6; index += 1) {
      const angle = index / 6 * Math.PI * 2;
      const fragment = this.scene.add.rectangle(
        position.x,
        position.y,
        5,
        3,
        index % 2 === 0 ? 0x69736f : 0x343f3b,
        0.95,
      ).setDepth(WORLD_RENDER_DEPTH.combatEffect).setRotation(angle);
      this.fadeAndDestroy(fragment, 260, {
        x: position.x + Math.cos(angle) * 28,
        y: position.y + Math.sin(angle) * 28,
        scale: 0.5,
      });
    }
  }

  destroy(): void {
    for (const effect of this.active) {
      effect.destroy();
    }
    this.active.clear();
  }

  private createZombieCorpse(
    radius: number,
    appearance: ZombieAppearance = createZombieAppearance(0, 0),
  ): {
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
    shadow.fillStyle(HUMANOID_VISUAL.shadow.color, 0.32);
    shadow.fillEllipse(0, 4, safeRadius * 2.15, safeRadius * 1.45);
    const torso = this.scene.add.graphics();
    this.drawCorpseTorso(torso, appearance);
    const head = this.scene.add.graphics();
    this.drawCorpseHead(head, appearance);
    const upperArm = this.createCorpseArm(
      appearance.clothing.base,
      appearance.skin.base,
      appearance.skin.shadow,
      appearance.sleeves,
    );
    upperArm.setPosition(0, -10);
    const lowerArm = this.createCorpseArm(
      appearance.clothing.base,
      appearance.skin.base,
      appearance.skin.shadow,
      appearance.sleeves,
    );
    lowerArm.setPosition(0, 10);
    const upperLeg = this.createCorpseLeg(appearance.clothing.base);
    upperLeg.setPosition(-9, -6);
    const lowerLeg = this.createCorpseLeg(appearance.clothing.detail);
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
      safeRadius * 2.9,
      safeRadius * 2.1,
      0x681019,
      1,
    );
    const forwardLobe = this.scene.add.ellipse(
      safeRadius * 0.82,
      -safeRadius * 0.72,
      safeRadius * 1.26,
      safeRadius * 0.9,
      0x861b24,
      0.95,
    );
    const sideLobe = this.scene.add.ellipse(
      -safeRadius * 0.68,
      safeRadius * 0.82,
      safeRadius * 1.18,
      safeRadius * 0.88,
      0x541018,
      0.94,
    );
    const highlight = this.scene.add.ellipse(
      safeRadius * 0.36,
      -safeRadius * 0.72,
      safeRadius * 0.82,
      safeRadius * 0.28,
      0xb83a3f,
      0.58,
    );
    const droplets = [
      this.scene.add.circle(
        safeRadius * 1.65,
        -safeRadius * 0.82,
        safeRadius * 0.16,
        0x7c1720,
        0.92,
      ),
      this.scene.add.circle(
        safeRadius * 1.92,
        -safeRadius * 0.58,
        safeRadius * 0.1,
        0x9a222a,
        0.88,
      ),
      this.scene.add.circle(
        -safeRadius * 1.48,
        safeRadius * 0.92,
        safeRadius * 0.13,
        0x64121a,
        0.9,
      ),
    ];
    return this.scene.add.container(
      0,
      0,
      [main, forwardLobe, sideLobe, highlight, ...droplets],
    );
  }

  private drawCorpseTorso(
    torso: Phaser.GameObjects.Graphics,
    appearance: ZombieAppearance,
  ): void {
    const bodyScale = appearance.bodyType === 'slim'
      ? 0.88
      : appearance.bodyType === 'broad' ? 1.1 : 1;
    const halfHeight = HUMANOID_VISUAL.torsoHeight * bodyScale / 2;
    const torsoWidth = HUMANOID_VISUAL.torsoWidth
      + (appearance.bodyType === 'broad' ? 2 : 0);
    torso
      .fillStyle(HUMANOID_VISUAL.outlineColor, 1)
      .fillRoundedRect(-15, -halfHeight, torsoWidth, halfHeight * 2, 8)
      .fillStyle(appearance.clothing.base, 1)
      .fillRoundedRect(-13, -halfHeight + 3, torsoWidth - 4, halfHeight * 2 - 6, 6);

    if (appearance.archetype === 'worker') {
      torso
        .fillStyle(appearance.clothing.detail, 0.85)
        .fillRect(-7, -halfHeight + 4, 4, halfHeight * 2 - 8);
    } else if (appearance.archetype === 'office') {
      torso
        .fillStyle(appearance.clothing.detail, 0.9)
        .fillTriangle(7, -6, 7, 0, 1, -4)
        .fillTriangle(7, 6, 7, 0, 1, 4);
    } else if (appearance.archetype === 'athletic') {
      torso
        .fillStyle(appearance.clothing.detail, 0.9)
        .fillRect(-10, -halfHeight + 4, 3, halfHeight * 2 - 8)
        .fillRect(3, -halfHeight + 5, 3, halfHeight * 2 - 10);
    } else if (appearance.archetype === 'medical') {
      torso
        .fillStyle(appearance.clothing.detail, 0.82)
        .fillTriangle(7, -5, 7, 5, 1, 0)
        .lineStyle(1.5, appearance.clothing.detail, 0.9)
        .strokeRoundedRect(-8, 5, 7, 6, 1);
    } else if (appearance.archetype === 'casualFemale') {
      torso
        .fillStyle(appearance.clothing.detail, 0.72)
        .fillTriangle(-10, -halfHeight + 4, -10, halfHeight - 4, 7, 0)
        .fillStyle(appearance.clothing.base, 1)
        .fillTriangle(-7, -halfHeight + 6, -7, halfHeight - 6, 8, 0);
    } else {
      torso
        .fillStyle(appearance.clothing.detail, 0.7)
        .fillRect(-8, -halfHeight + 5, 2, halfHeight * 2 - 10);
    }
  }

  private drawCorpseHead(
    head: Phaser.GameObjects.Graphics,
    appearance: ZombieAppearance,
  ): void {
    head
      .fillStyle(HUMANOID_VISUAL.outlineColor, 1)
      .fillEllipse(2, 0, HUMANOID_VISUAL.headWidth, HUMANOID_VISUAL.headHeight)
      .fillStyle(appearance.skin.base, 1)
      .fillEllipse(3, 0.5, 20, 21)
      .fillStyle(appearance.skin.highlight, 0.35)
      .fillEllipse(6, -3, 7, 11);

    if (appearance.hair === 'bald') return;
    if (appearance.hair === 'side-part') {
      head
        .fillStyle(appearance.hairColor.base, 1)
        .fillEllipse(0, -4, 13, 13);
      return;
    }
    if (appearance.hair === 'ponytail') {
      head
        .fillStyle(HUMANOID_VISUAL.outlineColor, 0.9)
        .fillEllipse(-13, 5, 17, 9)
        .fillStyle(appearance.hairColor.base, 1)
        .fillEllipse(-13, 5, 14, 6);
    }
    head
      .fillStyle(appearance.hairColor.base, 1)
      .fillEllipse(-1, 0, 10, 21)
      .fillStyle(appearance.hairColor.highlight, 0.65)
      .fillEllipse(1, -5, 4, 8);
  }

  private createCorpseArm(
    clothingColor: number,
    skinColor: number,
    handColor: number,
    sleeves: ZombieSleeves,
  ): Phaser.GameObjects.Graphics {
    const arm = this.scene.add.graphics();
    arm.lineStyle(HUMANOID_VISUAL.outlineWidth, HUMANOID_VISUAL.outlineColor, 1);
    arm.beginPath();
    arm.moveTo(0, 0);
    arm.lineTo(11, -3);
    arm.lineTo(22, 0);
    arm.strokePath();
    arm.lineStyle(
      HUMANOID_VISUAL.armWidth,
      sleeves === 'long' ? clothingColor : skinColor,
      1,
    );
    arm.beginPath();
    arm.moveTo(0, 0);
    arm.lineTo(11, -3);
    arm.lineTo(22, 0);
    arm.strokePath();
    if (sleeves === 'short') {
      arm.lineStyle(HUMANOID_VISUAL.armWidth, clothingColor, 1);
      arm.beginPath();
      arm.moveTo(0, 0);
      arm.lineTo(11, -3);
      arm.strokePath();
    }
    arm
      .fillStyle(HUMANOID_VISUAL.outlineColor, 1)
      .fillCircle(22, 0, 3.5)
      .fillStyle(handColor, 1)
      .fillCircle(22, 0, 2.1);
    return arm;
  }

  private createCorpseLeg(color: number): Phaser.GameObjects.Graphics {
    const leg = this.scene.add.graphics();
    leg.lineStyle(13, HUMANOID_VISUAL.outlineColor, 1);
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
    leg.fillStyle(HUMANOID_VISUAL.outlineColor, 1);
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
