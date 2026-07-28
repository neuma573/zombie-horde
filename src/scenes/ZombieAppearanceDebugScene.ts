import Phaser from 'phaser';

import { CombatEffects } from '../effects/CombatEffects';
import { Player } from '../entities/Player';
import { Zombie } from '../entities/Zombie';
import { createZombieAppearance } from '../logic/zombieAppearance';

const DIRECTIONS = [0, 45, 90, 135, 180, 225, 270, 315] as const;

interface MovingZombie {
  zombie: Zombie;
  originX: number;
  phase: number;
}

export class ZombieAppearanceDebugScene extends Phaser.Scene {
  private readonly movingZombies: MovingZombie[] = [];
  private elapsedMs = 0;

  constructor() {
    super('ZombieAppearanceDebugScene');
  }

  create(): void {
    this.cameras.main.setBackgroundColor(0x151a1c);
    const width = this.scale.width;
    const height = this.scale.height;
    const panelTop = 72;
    const panelHeight = Math.max(240, height - panelTop - 32);

    this.add.rectangle(
      width * 0.25,
      panelTop + panelHeight / 2,
      width / 2,
      panelHeight,
      0xa8a795,
    );
    this.add.rectangle(
      width * 0.75,
      panelTop + panelHeight / 2,
      width / 2,
      panelHeight,
      0x252c2d,
    );
    this.add.text(18, 14, 'ZOMBIE APPEARANCE DEBUG', {
      color: '#f3f5f6',
      fontFamily: 'monospace',
      fontSize: '16px',
    });
    this.add.text(18, 39, '8 directions · player scale · moving overlap · light/dark ground', {
      color: '#aeb9bd',
      fontFamily: 'monospace',
      fontSize: '12px',
    });

    const columns = 4;
    const cellWidth = width / columns;
    const rowY = [panelTop + 70, panelTop + 155];
    DIRECTIONS.forEach((degrees, index) => {
      const x = cellWidth * (index % columns + 0.5);
      const y = rowY[Math.floor(index / columns)];
      const zombie = new Zombie(this, `direction-${degrees}`, x, y);
      zombie.setRotation(Phaser.Math.DegToRad(degrees));
      zombie.updateAttackVisual();
      this.add.text(x, y + 38, `${degrees}°`, {
        color: index % columns < 2 ? '#283033' : '#d7dfe1',
        fontFamily: 'monospace',
        fontSize: '11px',
      }).setOrigin(0.5);
    });

    const comparisonY = panelTop + 245;
    const male = new Player(this, width * 0.14, comparisonY, 'male-swat');
    const comparisonZombie = new Zombie(this, 'comparison', width * 0.25, comparisonY);
    const female = new Player(this, width * 0.36, comparisonY, 'female-swat');
    male.setRotation(-Math.PI / 4);
    comparisonZombie.setRotation(-Math.PI / 4);
    comparisonZombie.updateAttackVisual();
    female.setRotation(-Math.PI / 4);

    const deathEffects = new CombatEffects(this);
    [0, 1].forEach((index) => {
      const appearance = createZombieAppearance(0xc0ffee, index + 3);
      const liveX = width * (0.57 + index * 0.21);
      const corpseX = liveX + 76;
      const live = new Zombie(
        this,
        `death-reference-${index}`,
        liveX,
        comparisonY,
        appearance,
      );
      live.setRotation(-Math.PI / 4);
      live.updateAttackVisual();
      deathEffects.playZombieDeath({
        position: { x: corpseX, y: comparisonY },
        radius: live.hitRadius,
        direction: { x: 1, y: 0 },
        rotation: live.rotation,
        variantKey: live.id,
        appearance,
      });
    });

    const clusterY = Math.min(panelTop + panelHeight - 65, comparisonY + 105);
    for (let index = 0; index < 6; index += 1) {
      const originX = width * 0.62 + index * 16;
      const zombie = new Zombie(
        this,
        `cluster-${index}`,
        originX,
        clusterY + (index % 2) * 10,
      );
      zombie.setRotation(index % 2 === 0 ? 0 : Math.PI / 4);
      zombie.updateAttackVisual();
      this.movingZombies.push({ zombie, originX, phase: index * 0.7 });
    }
  }

  update(_time: number, deltaMs: number): void {
    this.elapsedMs += deltaMs;
    for (const moving of this.movingZombies) {
      moving.zombie.x = moving.originX
        + Math.sin(this.elapsedMs * 0.0018 + moving.phase) * 18;
      moving.zombie.updateMuzzleReflection(deltaMs);
      moving.zombie.updateAttackVisual();
    }
  }
}
