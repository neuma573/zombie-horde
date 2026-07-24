import type { WaveConfig } from '../logic/wave';
import type { WeaponConfig } from '../logic/weapon';
import { URBAN_MAP_CONFIG } from './urbanMapConfig';

export const MVP_CONFIG = {
  map: {
    width: URBAN_MAP_CONFIG.width,
    height: URBAN_MAP_CONFIG.height,
    gridSize: URBAN_MAP_CONFIG.gridSize,
  },
  player: {
    health: 100,
    radius: 18,
    speed: 240,
    invulnerabilityMs: 400,
    spawn: {
      x: 2_000,
      y: 1_500,
    },
  },
  weapon: {
    damage: 25,
    range: 600,
    fireIntervalMs: 250,
    magazineSize: 12,
    reserveAmmo: 300,
    reloadDurationMs: 1_500,
    maxTargets: 1,
  } satisfies WeaponConfig,
  zombie: {
    health: 50,
    speed: 80,
    radius: 20,
    contactDamage: 10,
    attackWindupMs: 260,
    attackIntervalMs: 800,
  },
  wave: {
    initialDelayMs: 1_000,
    betweenWaveDelayMs: 2_000,
    spawnIntervalMs: 450,
    spawnIntervalReductionPerWaveMs: 20,
    minimumSpawnIntervalMs: 180,
    baseZombieCount: 5,
    zombiesPerWave: 3,
  } satisfies WaveConfig,
  spawn: {
    minPlayerDistance: 160,
  },
} as const;
