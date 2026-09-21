import type { Vector2, HitscanBlocker } from '../logic/hitscan';
import type { RectangleObstacle } from '../logic/obstacleCollision';
import type { WeaponId } from '../logic/weapon';

export interface DefenseSectorConfig {
  id: string;
  barricadeId: string;
  barricade: RectangleObstacle;
  zombieSpawnAreas: readonly RectangleObstacle[];
  /** Open doorway into the building, separate from the barricade's breach area. */
  entranceArea: RectangleObstacle;
  approachArea: RectangleObstacle;
  breachArea: RectangleObstacle;
}

export interface CityDefenseConfig {
  cityId: string;
  inflow: DefenseInflowConfig;
  worldSize: { width: number; height: number };
  sectors: readonly DefenseSectorConfig[];
  playerSpawn: Vector2;
  allyPositions: readonly Vector2[];
  /** Entire indoor floor, including the zombie approach in front of the barricade. */
  interiorArea: RectangleObstacle;
  combatArea: RectangleObstacle;
  walls: readonly HitscanBlocker[];
  fixtures?: readonly (RectangleObstacle & { kind: 'shelf' | 'counter' | 'crate' })[];
}

export interface DefenseInflowConfig {
  initialDelayMs: number;
  minimumGroupSize: number;
  maximumGroupSize: number;
  minimumSpawnIntervalMs: number;
  maximumSpawnIntervalMs: number;
  minimumQuietMs: number;
  maximumQuietMs: number;
  maximumAlive: number;
  fastZombieChance: number;
}

export interface LastStandCombatStart {
  day: number;
  barricades: Record<string, number>;
  slots: [WeaponId | null, WeaponId | null];
}

export type NightCombatPhase = 'PREPARING' | 'COMBAT' | 'VICTORY' | 'DEFEAT';
export type DefenseSectorPhase = 'ACTIVE' | 'DANGER' | 'BREACHED';

export interface LastStandNightVictory {
  day: number;
  barricade: number;
}
