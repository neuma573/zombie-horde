import Phaser from 'phaser';

import { ZOMBIE_CONFIG } from '../config/zombieConfig';
import { Zombie } from '../entities/Zombie';

export class SpawnSystem {
  private nextZombieId = 1;

  spawn(scene: Phaser.Scene): Zombie {
    const radius = ZOMBIE_CONFIG.radius;
    const positions = [
      { x: scene.scale.width / 2, y: radius },
      { x: scene.scale.width - radius, y: scene.scale.height / 2 },
      { x: scene.scale.width / 2, y: scene.scale.height - radius },
      { x: radius, y: scene.scale.height / 2 },
    ];
    const id = this.nextZombieId;
    const position = positions[(id - 1) % positions.length];
    this.nextZombieId += 1;

    return new Zombie(scene, `zombie-${id}`, position.x, position.y);
  }
}
