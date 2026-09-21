import { describe, expect, it } from 'vitest';

import {
  fastZombieSpeedMultiplier,
  fastZombieSpawnChance,
  isFastZombieSpawn,
  type FastZombieConfig,
} from '../../../logic/fastZombie';

const config: FastZombieConfig = {
  initialSpawnChance: 0.05,
  spawnChancePerWave: 0.05,
  maximumSpawnChance: 0.4,
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

  it('runs at no less than twice walking speed from spawn', () => {
    const speed = fastZombieSpeedMultiplier(42, config);
    expect(speed).toBeGreaterThanOrEqual(2);
    expect(speed).toBeLessThanOrEqual(3);
  });

  // Pursuit distance and elapsed-time regression cases live in zombiePursuit.test.ts.
});
