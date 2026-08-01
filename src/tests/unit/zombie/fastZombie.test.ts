import { describe, expect, it } from 'vitest';

import {
  advanceFastZombieRun,
  createFastZombieRunState,
  fastZombieSpawnChance,
  isFastZombieSpawn,
  type FastZombieConfig,
} from '../../../logic/fastZombie';

const config: FastZombieConfig = {
  initialSpawnChance: 0.05,
  spawnChancePerWave: 0.05,
  maximumSpawnChance: 0.4,
  spontaneousRunChance: 1,
  runCheckIntervalMs: 1_000,
  minimumRunDurationMs: 1_500,
  maximumRunDurationMs: 3_000,
  minimumRunCooldownMs: 1_000,
  maximumRunCooldownMs: 2_000,
  proximityRunDistance: 200,
  minimumSpeedMultiplier: 2,
  maximumSpeedMultiplier: 3,
};

describe('fast zombie behavior', () => {
  it('increases spawn chance by wave without crossing the configured maximum', () => {
    expect(fastZombieSpawnChance(1, config)).toBe(0.05);
    expect(fastZombieSpawnChance(4, config)).toBeCloseTo(0.2);
    expect(fastZombieSpawnChance(100, config)).toBe(0.4);
    expect(isFastZombieSpawn(4, 0.19, config)).toBe(true);
    expect(isFastZombieSpawn(4, 0.2, config)).toBe(false);
  });

  it('always runs near the player at no less than twice walking speed', () => {
    const result = advanceFastZombieRun(
      createFastZombieRunState(config),
      16,
      200,
      42,
      config,
    );

    expect(result.isRunning).toBe(true);
    expect(result.state.speedMultiplier).toBeGreaterThanOrEqual(2);
    expect(result.state.speedMultiplier).toBeLessThanOrEqual(3);
    expect(result.state.runRemainingMs).toBeGreaterThanOrEqual(1_500);
    expect(result.state.runRemainingMs).toBeLessThanOrEqual(3_000);
  });

  it('starts a random run when its check interval elapses', () => {
    const before = advanceFastZombieRun(
      createFastZombieRunState(config),
      999,
      201,
      42,
      config,
    );
    const atBoundary = advanceFastZombieRun(before.state, 1, 201, 42, config);

    expect(before.isRunning).toBe(false);
    expect(atBoundary.isRunning).toBe(true);
  });

  it('produces the same state for split and combined elapsed time', () => {
    const initial = createFastZombieRunState(config);
    const combined = advanceFastZombieRun(initial, 2_400, 201, 42, config);
    const first = advanceFastZombieRun(initial, 800, 201, 42, config);
    const second = advanceFastZombieRun(first.state, 1_600, 201, 42, config);

    expect(second).toEqual(combined);
  });

  it('waits for a random cooldown after a run ends', () => {
    const running = advanceFastZombieRun(
      createFastZombieRunState(config),
      1_000,
      201,
      42,
      config,
    );
    const finished = advanceFastZombieRun(
      running.state,
      running.state.runRemainingMs,
      201,
      42,
      config,
    );

    expect(finished.isRunning).toBe(false);
    expect(finished.state.checkRemainingMs).toBeGreaterThanOrEqual(1_000);
    expect(finished.state.checkRemainingMs).toBeLessThanOrEqual(2_000);
  });
});
