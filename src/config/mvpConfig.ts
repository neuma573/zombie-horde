import type { WaveConfig } from '../logic/wave';
import type { WeaponConfig } from '../logic/weapon';

export const MVP_CONFIG = {
  map: {
    width: 2_400,
    height: 1_600,
    gridSize: 80,
    obstacles: [
      { x: 720, y: 520, width: 320, height: 90 },
      { x: 1_420, y: 500, width: 300, height: 100 },
      { x: 1_020, y: 1_060, width: 360, height: 90 },
      { x: 500, y: 840, width: 100, height: 340 },
      { x: 1_800, y: 760, width: 100, height: 360 },
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
