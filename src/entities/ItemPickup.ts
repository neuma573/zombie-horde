import Phaser from 'phaser';

import { ITEM_BALANCE_CONFIG } from '../config/itemConfig';
import type { ConsumableItemKind } from '../logic/item';

const ITEM_COLORS: Record<ConsumableItemKind, number> = {
  pistolAmmo: 0xd6b96e,
  rifleAmmo: 0x9fbd67,
  medical: 0xd95858,
};

export class ItemPickup extends Phaser.GameObjects.Container {
  private readonly glow: Phaser.GameObjects.Arc;
  private visualElapsedMs = 0;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    readonly kind: ConsumableItemKind,
  ) {
    const color = ITEM_COLORS[kind];
    const glow = scene.add.circle(0, 0, 24, color, 0.22)
      .setStrokeStyle(2, color, 0.72)
      .setBlendMode(Phaser.BlendModes.ADD);
    const icon = scene.add.graphics()
      .fillStyle(0x172027, 1)
      .fillRoundedRect(-13, -10, 26, 20, 4)
      .fillStyle(color, 1);
    if (kind === 'medical') {
      icon.fillRect(-3, -7, 6, 14).fillRect(-7, -3, 14, 6);
    } else {
      icon
        .fillRoundedRect(-8, -7, 5, 14, 2)
        .fillRoundedRect(0, -7, 5, 14, 2)
        .fillRoundedRect(8, -7, 5, 14, 2);
    }
    super(scene, x, y, [glow, icon]);
    this.glow = glow;
    scene.add.existing(this);
    this.setSize(
      ITEM_BALANCE_CONFIG.pickupRadius,
      ITEM_BALANCE_CONFIG.pickupRadius,
    ).setDepth(10);
  }

  advanceVisual(deltaMs: number): void {
    this.visualElapsedMs += Math.max(0, deltaMs);
    const pulse = (Math.sin(this.visualElapsedMs * 0.004) + 1) / 2;
    this.glow
      .setAlpha(0.55 + pulse * 0.25)
      .setScale(0.92 + pulse * 0.14);
  }
}
