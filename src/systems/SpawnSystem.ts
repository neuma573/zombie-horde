import Phaser from 'phaser';

import type { SpawnConfig } from '../config/spawnConfig';
import { Zombie } from '../entities/Zombie';
import { getEdgeSpawnPosition } from '../logic/spawn';
import type { MovementBounds } from '../logic/movement';
import type { Position } from '../logic/movement';

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
  ): Zombie {
    const id = this.nextZombieId;
    const position = getEdgeSpawnPosition(
      id - 1,
      bounds,
      this.zombieRadius,
      playerPosition,
      this.config.minimumZombieDistanceFromPlayer,
      this.seed,
    );
    this.nextZombieId += 1;

    return new Zombie(scene, `zombie-${id}`, position.x, position.y);
  }
}
