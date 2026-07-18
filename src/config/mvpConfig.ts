import type { WaveConfig } from '../logic/wave';
import type { WeaponConfig } from '../logic/weapon';

export const MVP_CONFIG = {
  map: {
    width: 2_400,
    height: 1_600,
    gridSize: 80,
    navigationCellSize: 40,
    obstacles: [
      { x: 720, y: 520, width: 320, height: 90 },
    ],
  },
  player: {
    health: 100,
    radius: 18,
    speed: 240,
    invulnerabilityMs: 400,
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
    attackIntervalMs: 800,
  },
  wave: {
    initialDelayMs: 1_000,
    betweenWaveDelayMs: 2_000,
    spawnIntervalMs: 500,
    baseZombieCount: 3,
    zombiesPerWave: 2,
  } satisfies WaveConfig,
  spawn: {
    minPlayerDistance: 160,
  },
} as const;
