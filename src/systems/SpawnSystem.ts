import Phaser from 'phaser';

import type { SpawnConfig } from '../config/spawnConfig';
import { PISTOL_WEAPON } from '../config/weaponConfig';
import { ZOMBIE_CONFIG } from '../config/zombieConfig';
import { Zombie } from '../entities/Zombie';
import {
  getOffscreenEdgeSpawnPosition,
  zombieHealthForSpawn,
  type SpawnExclusionRectangle,
} from '../logic/spawn';
import { createZombieAppearance } from '../logic/zombieAppearance';
import type { MovementBounds } from '../logic/movement';
import type { Position } from '../logic/movement';
import type { RectangleObstacle } from '../logic/obstacleCollision';

export class SpawnSystem {
  private nextZombieId = 1;
  private readonly seed: number;

  constructor(
    private readonly config: SpawnConfig,
    private readonly zombieRadius: number,
    seed = Math.floor(Math.random() * 0x1_0000_0000),
  ) {
    this.seed = seed >>> 0;
  }

  spawn(
    scene: Phaser.Scene,
    bounds: Omit<MovementBounds, 'padding'>,
    playerPosition: Position,
    cameraView: SpawnExclusionRectangle,
    obstacles: readonly RectangleObstacle[],
  ): Zombie {
    const id = this.nextZombieId;
    const position = getOffscreenEdgeSpawnPosition(
      id - 1,
      bounds,
      this.zombieRadius,
      playerPosition,
      this.config.minimumZombieDistanceFromPlayer,
      cameraView,
      obstacles,
      this.seed,
    );
    this.nextZombieId += 1;

    return new Zombie(
      scene,
      `zombie-${id}`,
      position.x,
      position.y,
      createZombieAppearance(this.seed, id - 1),
      zombieHealthForSpawn(
        id - 1,
        this.seed,
        PISTOL_WEAPON.config.damage,
        ZOMBIE_CONFIG.durabilityShots,
      ),
    );
  }
}
