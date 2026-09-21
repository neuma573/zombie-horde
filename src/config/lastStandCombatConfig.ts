import { GAME_TIME_CONFIG } from './gameTimeConfig';
import { ZOMBIE_CONFIG } from './zombieConfig';
import type { CityDefenseConfig } from '../types/lastStandCombat';

export const LAST_STAND_COMBAT_CONFIG = {
  startHour: 23,
  endHour: 5,
  maxIntegrity: 100,
  dangerThreshold: 10,
  // Percent points per strike; prolonged contact across successive groups adds up.
  barricadeDamage: 1,
  attackIntervalMs: ZOMBIE_CONFIG.attackIntervalMs,
  attackWindupMs: ZOMBIE_CONFIG.attackWindupMs,
  attackReach: 2,
} as const;

export const HAZARD_INFLOW_CONFIG = {
  initialDelayMs: 1500,
  minimumGroupSize: 2,
  maximumGroupSize: 4,
  minimumSpawnIntervalMs: 700,
  maximumSpawnIntervalMs: 1300,
  minimumQuietMs: 7000,
  maximumQuietMs: 11000,
  maximumAlive: 12,
  fastZombieChance: 0.25,
} as const;

export const DEFENSE_LIGHTING_CONFIG = { maximumDarknessAlpha: 0.72, interiorLightIntensity: 0.8 } as const;

export const DEFENSE_CAMERA_CONFIG = { initial: 0.75, min: 0.5 } as const;

export const LAST_STAND_TIME_CONFIG = {
  ...GAME_TIME_CONFIG,
  realMillisecondsPerGameHour: GAME_TIME_CONFIG.realMillisecondsPerGameHour / 4,
  realMillisecondsPerGameDay: GAME_TIME_CONFIG.realMillisecondsPerGameDay / 4,
  startMinuteOfDay: LAST_STAND_COMBAT_CONFIG.startHour * 60,
};

// West doorway -> indoor approach -> internal barricade -> player defense area.
export const HAZARD_DEFENSE_CONFIG: CityDefenseConfig = {
  cityId: 'hazard',
  inflow: HAZARD_INFLOW_CONFIG,
  worldSize: { width: 1400, height: 1000 },
  interiorArea: { x: 600, y: 480, width: 720, height: 440 },
  combatArea: { x: 1100, y: 480, width: 220, height: 440 },
  playerSpawn: { x: 1240, y: 700 },
  allyPositions: [{ x: 1240, y: 620 }, { x: 1240, y: 780 }],
  sectors: [{
    id: 'mainEntrance',
    barricadeId: 'hazard-main',
    barricade: { x: 1068, y: 480, width: 32, height: 440 },
    zombieSpawnAreas: [{ x: 180, y: 540, width: 80, height: 320 }],
    entranceArea: { x: 568, y: 600, width: 64, height: 200 },
    approachArea: { x: 600, y: 480, width: 468, height: 440 },
    breachArea: { x: 1100, y: 480, width: 80, height: 440 },
  }],
  fixtures: [
    { kind: 'shelf', x: 720, y: 480, width: 260, height: 44 },
    { kind: 'shelf', x: 720, y: 876, width: 220, height: 44 },
    { kind: 'shelf', x: 1140, y: 480, width: 140, height: 44 },
    { kind: 'counter', x: 1140, y: 864, width: 180, height: 56 },
    { kind: 'crate', x: 1270, y: 775, width: 50, height: 55 },
  ],
  walls: [
    { x: 568, y: 448, width: 784, height: 32, blocksHitscan: true },
    { x: 568, y: 920, width: 784, height: 32, blocksHitscan: true },
    { x: 568, y: 480, width: 32, height: 120, blocksHitscan: true },
    { x: 568, y: 800, width: 32, height: 120, blocksHitscan: true },
    { x: 1320, y: 480, width: 32, height: 440, blocksHitscan: true },
  ],
};
