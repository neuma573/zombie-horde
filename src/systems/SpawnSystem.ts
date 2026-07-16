import Phaser from 'phaser';

import { MVP_CONFIG } from '../config/mvpConfig';
import { ZOMBIE_CONFIG } from '../config/zombieConfig';
import { Zombie } from '../entities/Zombie';
import { getEdgeSpawnPosition } from '../logic/spawn';
import type { MovementBounds } from '../logic/movement';
import type { Position } from '../logic/movement';

export class SpawnSystem {
  private nextZombieId = 1;

  spawn(
    scene: Phaser.Scene,
    bounds: Omit<MovementBounds, 'padding'>,
    playerPosition: Position,
  ): Zombie {
    const radius = ZOMBIE_CONFIG.radius;
    const id = this.nextZombieId;
    const position = getEdgeSpawnPosition(
      id - 1,
      bounds,
      radius,
      playerPosition,
      MVP_CONFIG.spawn.minPlayerDistance,
    );
    this.nextZombieId += 1;

    return new Zombie(scene, `zombie-${id}`, position.x, position.y);
  }
}
