import Phaser from 'phaser';

import { BASIC_WEAPON_CONFIG } from '../config/weaponConfig';
import { Player, PLAYER_RADIUS, PLAYER_SPEED } from '../entities/Player';
import { resolveHitscan } from '../logic/hitscan';
import { moveWithinBounds } from '../logic/movement';
import { WeaponSystem } from '../systems/WeaponSystem';

type MovementKeys = Record<'up' | 'down' | 'left' | 'right', Phaser.Input.Keyboard.Key>;

export class GameScene extends Phaser.Scene {
  private player!: Player;
  private movementKeys?: MovementKeys;
  private reloadKey?: Phaser.Input.Keyboard.Key;
  private readonly weapon = new WeaponSystem(BASIC_WEAPON_CONFIG);

  constructor() {
    super('GameScene');
  }

  create(): void {
    this.player = new Player(this, this.scale.width / 2, this.scale.height / 2);

    this.movementKeys = this.input.keyboard?.addKeys({
      up: Phaser.Input.Keyboard.KeyCodes.W,
      down: Phaser.Input.Keyboard.KeyCodes.S,
      left: Phaser.Input.Keyboard.KeyCodes.A,
      right: Phaser.Input.Keyboard.KeyCodes.D,
    }) as MovementKeys | undefined;
    this.reloadKey = this.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.R);
    this.input.on(Phaser.Input.Events.POINTER_DOWN, this.fireWeapon, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.input.off(Phaser.Input.Events.POINTER_DOWN, this.fireWeapon, this);
    });
  }

  update(_time: number, deltaMs: number): void {
    this.weapon.update(deltaMs);

    if (this.reloadKey && Phaser.Input.Keyboard.JustDown(this.reloadKey)) {
      this.weapon.reload();
    }

    if (this.movementKeys) {
      const nextPosition = moveWithinBounds(
        this.player,
        {
          x: Number(this.movementKeys.right.isDown) - Number(this.movementKeys.left.isDown),
          y: Number(this.movementKeys.down.isDown) - Number(this.movementKeys.up.isDown),
        },
        PLAYER_SPEED,
        deltaMs,
        {
          width: this.scale.width,
          height: this.scale.height,
          padding: PLAYER_RADIUS,
        },
      );

      this.player.setPosition(nextPosition.x, nextPosition.y);
    }
  }

  private fireWeapon(pointer: Phaser.Input.Pointer): void {
    if (!this.weapon.fire()) {
      return;
    }

    resolveHitscan(
      { x: this.player.x, y: this.player.y },
      { x: pointer.worldX - this.player.x, y: pointer.worldY - this.player.y },
      BASIC_WEAPON_CONFIG.range,
      [],
      BASIC_WEAPON_CONFIG.maxTargets,
    );
  }
}
