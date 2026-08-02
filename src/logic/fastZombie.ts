export interface FastZombieConfig {
  initialSpawnChance: number;
  spawnChancePerWave: number;
  maximumSpawnChance: number;
  spontaneousRunChance: number;
  runCheckIntervalMs: number;
  minimumRunDurationMs: number;
  maximumRunDurationMs: number;
  minimumRunCooldownMs: number;
  maximumRunCooldownMs: number;
  proximityRunDistance: number;
  minimumSpeedMultiplier: number;
  maximumSpeedMultiplier: number;
}

export interface FastZombieRunState {
  checkRemainingMs: number;
  runRemainingMs: number;
  rollIndex: number;
  speedMultiplier: number;
}

export interface FastZombieRunUpdate {
  state: FastZombieRunState;
  isRunning: boolean;
}

function clamp01(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(1, Math.max(0, value));
}

function safeDuration(value: number): number {
  return Number.isFinite(value) ? Math.max(0, value) : 0;
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

export function createFastZombieRunState(config: FastZombieConfig): FastZombieRunState {
  return {
    checkRemainingMs: safeDuration(config.runCheckIntervalMs),
    runRemainingMs: 0,
    rollIndex: 0,
    speedMultiplier: 1,
  };
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

function runSpeedMultiplier(
  seed: number,
  rollIndex: number,
  config: FastZombieConfig,
): number {
  const minimum = Math.max(2, config.minimumSpeedMultiplier);
  const maximum = Math.max(minimum, config.maximumSpeedMultiplier);
  return minimum + (maximum - minimum) * fastZombieRandom(seed, rollIndex, 1);
}

function randomDuration(
  seed: number,
  rollIndex: number,
  channel: number,
  minimumValue: number,
  maximumValue: number,
): number {
  const minimum = safeDuration(minimumValue);
  const maximum = Math.max(minimum, safeDuration(maximumValue));
  return minimum + (maximum - minimum) * fastZombieRandom(seed, rollIndex, channel);
}

function runDuration(
  seed: number,
  rollIndex: number,
  config: FastZombieConfig,
): number {
  return randomDuration(
    seed,
    rollIndex,
    2,
    config.minimumRunDurationMs,
    config.maximumRunDurationMs,
  );
}

function runCooldown(
  seed: number,
  rollIndex: number,
  config: FastZombieConfig,
): number {
  return randomDuration(
    seed,
    rollIndex,
    3,
    config.minimumRunCooldownMs,
    config.maximumRunCooldownMs,
  );
}

export function advanceFastZombieRun(
  current: FastZombieRunState,
  deltaMs: number,
  distanceToPlayer: number,
  seed: number,
  config: FastZombieConfig,
): FastZombieRunUpdate {
  const state = { ...current };
  let remainingDeltaMs = safeDuration(deltaMs);
  const isNearPlayer = Number.isFinite(distanceToPlayer)
    && distanceToPlayer <= Math.max(0, config.proximityRunDistance);

  if (isNearPlayer) {
    if (state.runRemainingMs <= 0) {
      state.speedMultiplier = runSpeedMultiplier(seed, state.rollIndex, config);
      state.runRemainingMs = runDuration(seed, state.rollIndex, config);
      state.rollIndex += 1;
    }
    return { state, isRunning: true };
  }

  while (remainingDeltaMs > 0) {
    if (state.runRemainingMs > 0) {
      const elapsed = Math.min(remainingDeltaMs, state.runRemainingMs);
      state.runRemainingMs -= elapsed;
      remainingDeltaMs -= elapsed;
      if (state.runRemainingMs === 0) {
        state.speedMultiplier = 1;
        state.checkRemainingMs = runCooldown(seed, state.rollIndex, config);
      }
      continue;
    }

    if (state.checkRemainingMs > remainingDeltaMs) {
      state.checkRemainingMs -= remainingDeltaMs;
      remainingDeltaMs = 0;
      continue;
    }

    remainingDeltaMs -= state.checkRemainingMs;
    state.checkRemainingMs = safeDuration(config.runCheckIntervalMs);
    const rollIndex = state.rollIndex;
    state.rollIndex += 1;
    if (fastZombieRandom(seed, rollIndex) < clamp01(config.spontaneousRunChance)) {
      state.runRemainingMs = runDuration(seed, rollIndex, config);
      state.speedMultiplier = runSpeedMultiplier(seed, rollIndex, config);
    }

    if (state.checkRemainingMs === 0 && state.runRemainingMs === 0) break;
  }

  return { state, isRunning: state.runRemainingMs > 0 };
}
