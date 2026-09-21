export interface FastZombieConfig {
  initialSpawnChance: number;
  spawnChancePerWave: number;
  maximumSpawnChance: number;
  minimumSpeedMultiplier: number;
  maximumSpeedMultiplier: number;
}

function clamp01(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(1, Math.max(0, value));
}

export function fastZombieSpawnChance(
  waveNumber: number,
  config: FastZombieConfig,
): number {
  const safeWave = Number.isFinite(waveNumber) ? Math.floor(waveNumber) : 0;
  const waveOffset = Math.max(0, safeWave - 1);
  return Math.min(
    clamp01(config.maximumSpawnChance),
    clamp01(config.initialSpawnChance)
      + waveOffset * Math.max(0, config.spawnChancePerWave),
  );
}

export function isFastZombieSpawn(
  waveNumber: number,
  randomValue: number,
  config: FastZombieConfig,
): boolean {
  return clamp01(randomValue) < fastZombieSpawnChance(waveNumber, config);
}

export function fastZombieRandom(seed: number, rollIndex: number, channel = 0): number {
  let value = (seed >>> 0)
    ^ Math.imul(Math.max(0, Math.floor(rollIndex)) + 1, 0x9e3779b9)
    ^ Math.imul(channel + 1, 0x85ebca6b);
  value ^= value >>> 16;
  value = Math.imul(value, 0x7feb352d);
  value ^= value >>> 15;
  value = Math.imul(value, 0x846ca68b);
  value ^= value >>> 16;
  return (value >>> 0) / 0x1_0000_0000;
}

/** A fast zombie keeps its seeded running speed for its entire lifetime. */
export function fastZombieSpeedMultiplier(seed: number, config: FastZombieConfig): number {
  const minimum = Math.max(2, config.minimumSpeedMultiplier);
  const maximum = Math.max(minimum, config.maximumSpeedMultiplier);
  return minimum + (maximum - minimum) * fastZombieRandom(seed, 0, 1);
}
