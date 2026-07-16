import Phaser from 'phaser';

import type { ImpactEffectEvent, ShotEffectEvent } from '../logic/combatEffects';

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

    const offsetX = event.endPoint.x - event.origin.x;
    const offsetY = event.endPoint.y - event.origin.y;
    const length = Math.hypot(offsetX, offsetY);
    const muzzle = this.scene.add.circle(
      event.origin.x + (length > 0 ? offsetX / length * 22 : 0),
      event.origin.y + (length > 0 ? offsetY / length * 22 : 0),
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

    const flash = this.scene.add.circle(
      event.position.x,
      event.position.y,
      event.radius,
      0xd8ffb8,
      0.65,
    ).setDepth(EFFECT_DEPTH);
    this.fadeAndDestroy(flash, 110);
  }

  playZombieDeath(event: ImpactEffectEvent): void {
    if (!this.enabled) {
      return;
    }

    const ring = this.scene.add.circle(
      event.position.x,
      event.position.y,
      event.radius,
      0x000000,
      0,
    ).setStrokeStyle(3, 0x9ee58c, 0.9).setDepth(EFFECT_DEPTH);
    this.fadeAndDestroy(ring, 180, { scale: 1.7 });
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

  private fadeAndDestroy(
    effect: Phaser.GameObjects.GameObject,
    duration: number,
    extra: { scale?: number } = {},
  ): void {
    this.active.add(effect);
    this.scene.tweens.add({
      targets: effect,
      alpha: 0,
      duration,
      ease: 'Linear',
      ...(extra.scale === undefined ? {} : { scale: extra.scale }),
      onComplete: () => {
        this.active.delete(effect);
        effect.destroy();
      },
    });
  }
}
