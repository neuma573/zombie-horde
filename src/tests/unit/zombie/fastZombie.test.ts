import { moveToward } from '../../../logic/movement';
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

  it('keeps the same running speed across repeated movement updates', () => {
    const speed = fastZombieSpeedMultiplier(42, config);
    for (let frame = 0; frame < 10000; frame++) {
      expect(fastZombieSpeedMultiplier(42, config)).toBe(speed);
    }
  });

  it('travels the same distance for split and combined elapsed time', () => {
    const advance = (x: number, ms: number) => moveToward({ x, y: 0 }, { x: 10000, y: 0 },
      100 * fastZombieSpeedMultiplier(42, config), ms).x;
    expect(advance(advance(0, 800), 1600)).toBeCloseTo(advance(0, 2400));
  });

  it('continues running beyond the former run and cooldown periods', () => {
    const speed = 100 * fastZombieSpeedMultiplier(42, config);
    const first = moveToward({ x: 0, y: 0 }, { x: 100000, y: 0 }, speed, 10000);
    const next = moveToward(first, { x: 100000, y: 0 }, speed, 10000);
    expect(first.x).toBeGreaterThanOrEqual(2000);
    expect(next.x - first.x).toBeCloseTo(first.x);
  });
});
