import Phaser from 'phaser';

import { ITEM_BALANCE_CONFIG } from '../config/itemConfig';
import type { ConsumableItemKind } from '../logic/item';

const ITEM_COLORS: Record<ConsumableItemKind, number> = {
  pistolAmmo: 0xd6b96e,
  rifleAmmo: 0x9fbd67,
  medical: 0xd95858,
};

export class ItemPickup extends Phaser.GameObjects.Container {
  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    readonly kind: ConsumableItemKind,
  ) {
    const color = ITEM_COLORS[kind];
    const glow = scene.add.circle(0, 0, 21, color, 0.28)
      .setStrokeStyle(2, color, 0.8);
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
    scene.add.existing(this);
    this.setSize(
      ITEM_BALANCE_CONFIG.pickupRadius,
      ITEM_BALANCE_CONFIG.pickupRadius,
    ).setDepth(10);
  }
}
