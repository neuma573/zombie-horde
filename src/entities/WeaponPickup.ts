import Phaser from 'phaser';

import {
  advanceWeaponPickupLifetime,
  type OwnedWeapon,
  type WeaponDefinition,
} from '../logic/weapon';

export const WEAPON_PICKUP_RADIUS = 48;
export const WEAPON_PICKUP_LIFETIME_MS = 30_000;
const RARITY_COLORS = {
  common: 0x9ca5ad,
  uncommon: 0x4fc47a,
  rare: 0x4f8cff,
  epic: 0xb96cff,
  legendary: 0xffa63d,
} as const;

export class WeaponPickup extends Phaser.GameObjects.Container {
  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    readonly ownedWeapon: OwnedWeapon,
    textureKey: string,
  ) {
    const definition = ownedWeapon.definition;
    const rarityColor = RARITY_COLORS[definition.rarity];
    const glow = scene.add.circle(0, 0, 30, rarityColor, 0.42)
      .setStrokeStyle(3, rarityColor, 0.95);
    const icon = scene.add.image(0, 0, textureKey)
      .setDisplaySize(52, 52);
    super(scene, x, y, [glow, icon]);
    scene.add.existing(this);
    this.setSize(58, 58).setDepth(10).setInteractive({ useHandCursor: true });
  }

  private remainingLifetimeMs = WEAPON_PICKUP_LIFETIME_MS;

  get definition(): WeaponDefinition {
    return this.ownedWeapon.definition;
  }

  advanceLifetime(deltaMs: number): boolean {
    this.remainingLifetimeMs = advanceWeaponPickupLifetime(
      this.remainingLifetimeMs,
      deltaMs,
    );
    return this.remainingLifetimeMs === 0;
  }
}
