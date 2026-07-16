import Phaser from 'phaser';

import { PLAYER_CONFIG } from '../config/playerConfig';
import { BASIC_WEAPON_CONFIG } from '../config/weaponConfig';
import { WAVE_CONFIG } from '../config/waveConfig';
import { ZOMBIE_CONFIG } from '../config/zombieConfig';
import { Player, PLAYER_RADIUS, PLAYER_SPEED } from '../entities/Player';
import { Zombie } from '../entities/Zombie';
import { resolveAimDirection } from '../logic/aim';
import { isPrimaryFireInput } from '../logic/fireInput';
import { resolveHitscan, type Vector2 } from '../logic/hitscan';
import {
  constrainToBounds,
  moveToward,
  moveWithinBounds,
  type MovementBounds,
} from '../logic/movement';
import {
  createSessionState,
  isPlaying,
  transitionToGameOver,
  type SessionState,
} from '../logic/session';
import { DamageSystem } from '../systems/DamageSystem';
import { SpawnSystem } from '../systems/SpawnSystem';
import { WaveSystem } from '../systems/WaveSystem';
import { WeaponSystem } from '../systems/WeaponSystem';

type MovementKeys = Record<'up' | 'down' | 'left' | 'right', Phaser.Input.Keyboard.Key>;

export class GameScene extends Phaser.Scene {
  private player!: Player;
  private movementKeys?: MovementKeys;
  private reloadKey?: Phaser.Input.Keyboard.Key;
  private restartKey?: Phaser.Input.Keyboard.Key;
  private lastAimDirection: Vector2 = { x: 1, y: 0 };
  private zombies: Zombie[] = [];
  private sessionState: SessionState = createSessionState();
  private playArea: Omit<MovementBounds, 'padding'> = { width: 0, height: 0 };
  private readonly damage = new DamageSystem();
  private spawn!: SpawnSystem;
  private wave!: WaveSystem;
  private weapon!: WeaponSystem;

  constructor() {
    super('GameScene');
  }

  create(): void {
    this.sessionState = createSessionState();
    this.lastAimDirection = { x: 1, y: 0 };
    this.spawn = new SpawnSystem();
    this.wave = new WaveSystem(WAVE_CONFIG);
    this.weapon = new WeaponSystem(BASIC_WEAPON_CONFIG);
    this.player = new Player(this, this.scale.width / 2, this.scale.height / 2);
    this.zombies = [];
    this.resizePlayArea(this.scale.gameSize);

    this.movementKeys = this.input.keyboard?.addKeys({
      up: Phaser.Input.Keyboard.KeyCodes.W,
      down: Phaser.Input.Keyboard.KeyCodes.S,
      left: Phaser.Input.Keyboard.KeyCodes.A,
      right: Phaser.Input.Keyboard.KeyCodes.D,
    }) as MovementKeys | undefined;
    this.reloadKey = this.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.R);
    this.restartKey = this.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.ENTER);
    this.input.on(Phaser.Input.Events.POINTER_MOVE, this.updateAimDirection, this);
    this.input.on(Phaser.Input.Events.POINTER_DOWN, this.fireWeapon, this);
    this.scale.on(Phaser.Scale.Events.RESIZE, this.resizePlayArea, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.input.off(Phaser.Input.Events.POINTER_MOVE, this.updateAimDirection, this);
      this.input.off(Phaser.Input.Events.POINTER_DOWN, this.fireWeapon, this);
      this.scale.off(Phaser.Scale.Events.RESIZE, this.resizePlayArea, this);
    });
  }

  update(_time: number, deltaMs: number): void {
    if (!isPlaying(this.sessionState)) {
      if (this.restartKey && Phaser.Input.Keyboard.JustDown(this.restartKey)) {
        this.restartSession();
      }
      return;
    }

    const playerStart = { x: this.player.x, y: this.player.y };

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
          width: this.playArea.width,
          height: this.playArea.height,
          padding: PLAYER_RADIUS,
        },
      );

      this.player.setPosition(nextPosition.x, nextPosition.y);
    }

    const zombieStarts = this.zombies.map((zombie) => ({ x: zombie.x, y: zombie.y }));

    for (const zombie of this.zombies) {
      const nextPosition = moveToward(zombie, this.player, ZOMBIE_CONFIG.speed, deltaMs);
      zombie.setPosition(nextPosition.x, nextPosition.y);
    }

    const contactDamage = this.damage.resolveZombieContacts(
      this.player,
      playerStart,
      this.zombies,
      zombieStarts,
      deltaMs,
      PLAYER_CONFIG.invulnerabilityMs,
      ZOMBIE_CONFIG.contactDamage,
      ZOMBIE_CONFIG.attackIntervalMs,
    );

    if (contactDamage.died) {
      const transition = transitionToGameOver(this.sessionState);
      this.sessionState = transition.state;

      if (transition.changed) {
        this.events.emit('player-died');
      }

      return;
    }

    const spawnCount = this.wave.update(deltaMs, this.zombies.length);

    for (let index = 0; index < spawnCount; index += 1) {
      this.zombies.push(this.spawn.spawn(this, this.playArea));
    }
  }

  private fireWeapon(pointer: Phaser.Input.Pointer): void {
    if (!isPrimaryFireInput(pointer)) {
      return;
    }

    if (!isPlaying(this.sessionState)) {
      this.restartSession();
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

  private restartSession(): void {
    this.scene.restart();
  }

  private resizePlayArea(gameSize: Phaser.Structs.Size): void {
    this.playArea = {
      width: gameSize.width,
      height: gameSize.height,
    };
    this.cameras.main.setViewport(0, 0, gameSize.width, gameSize.height);

    const playerPosition = constrainToBounds(this.player, {
      ...this.playArea,
      padding: PLAYER_RADIUS,
    });
    this.player.setPosition(playerPosition.x, playerPosition.y);

    for (const zombie of this.zombies) {
      const zombiePosition = constrainToBounds(zombie, {
        ...this.playArea,
        padding: zombie.hitRadius,
      });
      zombie.setPosition(zombiePosition.x, zombiePosition.y);
    }
  }
}
