import Phaser from 'phaser';

import { BASIC_WEAPON_CONFIG } from '../config/weaponConfig';
import { ZOMBIE_CONFIG } from '../config/zombieConfig';
import { Player, PLAYER_RADIUS, PLAYER_SPEED } from '../entities/Player';
import { Zombie } from '../entities/Zombie';
import { resolveAimDirection } from '../logic/aim';
import { isPrimaryFireInput } from '../logic/fireInput';
import { resolveHitscan, type Vector2 } from '../logic/hitscan';
import { moveToward, moveWithinBounds } from '../logic/movement';
import { DamageSystem } from '../systems/DamageSystem';
import { WeaponSystem } from '../systems/WeaponSystem';

type MovementKeys = Record<'up' | 'down' | 'left' | 'right', Phaser.Input.Keyboard.Key>;

export class GameScene extends Phaser.Scene {
  private player!: Player;
  private movementKeys?: MovementKeys;
  private reloadKey?: Phaser.Input.Keyboard.Key;
  private lastAimDirection: Vector2 = { x: 1, y: 0 };
  private zombies: Zombie[] = [];
  private readonly damage = new DamageSystem();
  private readonly weapon = new WeaponSystem(BASIC_WEAPON_CONFIG);

  constructor() {
    super('GameScene');
  }

  create(): void {
    this.player = new Player(this, this.scale.width / 2, this.scale.height / 2);
    this.zombies = [new Zombie(this, 'zombie-1', this.scale.width * 0.75, this.scale.height / 2)];

    this.movementKeys = this.input.keyboard?.addKeys({
      up: Phaser.Input.Keyboard.KeyCodes.W,
      down: Phaser.Input.Keyboard.KeyCodes.S,
      left: Phaser.Input.Keyboard.KeyCodes.A,
      right: Phaser.Input.Keyboard.KeyCodes.D,
    }) as MovementKeys | undefined;
    this.reloadKey = this.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.R);
    this.input.on(Phaser.Input.Events.POINTER_MOVE, this.updateAimDirection, this);
    this.input.on(Phaser.Input.Events.POINTER_DOWN, this.fireWeapon, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.input.off(Phaser.Input.Events.POINTER_MOVE, this.updateAimDirection, this);
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

    for (const zombie of this.zombies) {
      const nextPosition = moveToward(zombie, this.player, ZOMBIE_CONFIG.speed, deltaMs);
      zombie.setPosition(nextPosition.x, nextPosition.y);
    }
  }

  private fireWeapon(pointer: Phaser.Input.Pointer): void {
    if (!isPrimaryFireInput(pointer)) {
      return;
    }

    this.updateAimDirection(pointer);

    if (!this.weapon.fire()) {
      return;
    }

    const result = resolveHitscan(
      { x: this.player.x, y: this.player.y },
      this.lastAimDirection,
      BASIC_WEAPON_CONFIG.range,
      this.zombies.map((zombie) => ({
        id: zombie.id,
        position: { x: zombie.x, y: zombie.y },
        radius: zombie.hitRadius,
      })),
      BASIC_WEAPON_CONFIG.maxTargets,
    );

    const deadIds = new Set<string>();

    for (const hit of result.hits) {
      const zombie = this.zombies.find((candidate) => candidate.id === hit.targetId);

      if (zombie && this.damage.apply(zombie, BASIC_WEAPON_CONFIG.damage).died) {
        zombie.destroy();
        deadIds.add(zombie.id);
      }
    }

    if (deadIds.size > 0) {
      this.zombies = this.zombies.filter((zombie) => !deadIds.has(zombie.id));
    }
  }

  private updateAimDirection(pointer: Phaser.Input.Pointer): void {
    this.lastAimDirection = resolveAimDirection(
      { x: pointer.worldX - this.player.x, y: pointer.worldY - this.player.y },
      this.lastAimDirection,
    );
    this.player.setRotation(Math.atan2(this.lastAimDirection.y, this.lastAimDirection.x));
  }
}
