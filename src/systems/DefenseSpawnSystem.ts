import type { CityDefenseConfig, DefenseInflowConfig } from '../types/lastStandCombat';
import type { Vector2 } from '../logic/hitscan';

export interface DefenseSpawn {
  id: string;
  sectorId: string;
  position: Vector2;
  kind: 'normal' | 'fast';
}

/** Intermittent arrivals continue independently of kills. Full capacity skips arrivals. */
export class DefenseSpawnSystem {
  private remainingMs: number;
  private groupRemaining = 0;
  private sequence = 0;

  constructor(
    private readonly layout: CityDefenseConfig,
    private readonly config: DefenseInflowConfig,
    private readonly radius: number,
    private readonly random: () => number = Math.random,
  ) {
    if (!layout.sectors.length || layout.sectors.some(sector => !sector.zombieSpawnAreas.length)) {
      throw new Error('Defense inflow requires sectors with spawn areas');
    }
    if (!Object.values(config).every(Number.isFinite)
      || config.initialDelayMs < 0 || config.minimumGroupSize < 1 || config.maximumAlive < 1
      || config.minimumSpawnIntervalMs <= 0 || config.minimumQuietMs <= 0
      || config.maximumGroupSize < config.minimumGroupSize
      || config.maximumSpawnIntervalMs < config.minimumSpawnIntervalMs
      || config.maximumQuietMs < config.minimumQuietMs
      || config.fastZombieChance < 0 || config.fastZombieChance > 1) {
      throw new Error('Invalid defense inflow configuration');
    }
    this.remainingMs = config.initialDelayMs;
  }

  update(deltaMs: number, alive: number): DefenseSpawn[] {
    if (!Number.isFinite(deltaMs) || deltaMs <= 0) return [];
    let remaining = deltaMs;
    const spawns: DefenseSpawn[] = [];
    while (remaining >= this.remainingMs) {
      remaining -= this.remainingMs;
      if (this.groupRemaining === 0) {
        this.groupRemaining = Math.floor(this.between(this.config.minimumGroupSize, this.config.maximumGroupSize + 1));
      }
      // Draw placement regardless of capacity so the arrival schedule remains stable.
      const sequence = this.sequence++;
      const sector = this.layout.sectors[sequence % this.layout.sectors.length];
      const area = sector.zombieSpawnAreas[Math.floor(this.random() * sector.zombieSpawnAreas.length)];
      const paddingX = Math.min(this.radius, area.width / 2);
      const paddingY = Math.min(this.radius, area.height / 2);
      const position = {
        x: this.between(area.x + paddingX, area.x + area.width - paddingX),
        y: this.between(area.y + paddingY, area.y + area.height - paddingY),
      };
      const kind = this.random() < this.config.fastZombieChance ? 'fast' : 'normal';
      if (alive + spawns.length < this.config.maximumAlive) {
        spawns.push({ id: `defense-zombie-${sequence}`, sectorId: sector.id, position, kind });
      }
      this.groupRemaining--;
      this.remainingMs = this.groupRemaining === 0
        ? this.between(this.config.minimumQuietMs, this.config.maximumQuietMs)
        : this.between(this.config.minimumSpawnIntervalMs, this.config.maximumSpawnIntervalMs);
    }
    this.remainingMs -= remaining;
    return spawns;
  }

  private between(min: number, max: number): number { return min + (max - min) * this.random(); }
}
