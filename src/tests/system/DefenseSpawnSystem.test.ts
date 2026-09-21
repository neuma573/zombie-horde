import { describe, expect, it } from 'vitest';
import { DefenseSpawnSystem } from '../../systems/DefenseSpawnSystem';
import { HAZARD_DEFENSE_CONFIG, HAZARD_INFLOW_CONFIG } from '../../config/lastStandCombatConfig';

const schedule = {
  ...HAZARD_INFLOW_CONFIG,
  maximumAlive: 30,
  initialDelayMs: 1000,
  minimumGroupSize: 2,
  maximumGroupSize: 2,
  minimumSpawnIntervalMs: 500,
  maximumSpawnIntervalMs: 500,
  minimumQuietMs: 2000,
  maximumQuietMs: 2000,
};
function spawn() { return new DefenseSpawnSystem(HAZARD_DEFENSE_CONFIG, schedule, 20, () => 0.5); }

describe('DefenseSpawnSystem', () => {
  it('starts at the configured boundary and leaves a quiet interval between groups', () => {
    const system = spawn();
    expect(system.update(999, 0)).toHaveLength(0);
    expect(system.update(1, 0)).toHaveLength(1);
    expect(system.update(499, 1)).toHaveLength(0);
    expect(system.update(1, 1)).toHaveLength(1);
    expect(system.update(1999, 2)).toHaveLength(0);
    expect(system.update(1, 2)).toHaveLength(1);
  });
  it('continues sending groups while earlier zombies are alive', () => {
    expect(spawn().update(6000, 10)).toHaveLength(5);
  });
  it('caps living zombies without accumulating a delayed spawn burst', () => {
    const system = spawn();
    expect(system.update(5000, schedule.maximumAlive)).toHaveLength(0);
    expect(system.update(1, 0)).toHaveLength(0);
    expect(system.update(999, 0)).toHaveLength(1);
  });
  it('keeps arrivals and placement identical across frame partitions', () => {
    const one = spawn();
    const split = spawn();
    const expected = one.update(6000, 0);
    const actual = [];
    for (let i = 0; i < 360; i++) actual.push(...split.update(6000 / 360, actual.length));
    expect(actual).toEqual(expected);
  });
  it('keeps each spawn inside its assigned sector area', () => {
    const second = { ...HAZARD_DEFENSE_CONFIG.sectors[0], id: 'east', barricadeId: 'east-wall',
      zombieSpawnAreas: [{ x: 1700, y: 500, width: 100, height: 100 }] };
    const layout = { ...HAZARD_DEFENSE_CONFIG, sectors: [...HAZARD_DEFENSE_CONFIG.sectors, second] };
    const system = new DefenseSpawnSystem(layout, schedule, 20, () => 0.5);
    const arrivals = system.update(1500, 0);
    expect(arrivals.map(a => a.sectorId)).toEqual(['mainEntrance', 'east']);
    expect(arrivals[0].position.x).toBeLessThan(300);
    expect(arrivals[1].position.x).toBeGreaterThan(1700);
  });
  it('emits both normal and fast zombies according to the configured chance', () => {
    const fast = new DefenseSpawnSystem(HAZARD_DEFENSE_CONFIG, schedule, 20, () => 0.1);
    const normal = new DefenseSpawnSystem(HAZARD_DEFENSE_CONFIG, schedule, 20, () => 0.9);
    expect(fast.update(1000, 0)[0].kind).toBe('fast');
    expect(normal.update(1000, 0)[0].kind).toBe('normal');
  });
  it.each([0, -1, NaN, Infinity])('ignores invalid delta %s', delta => {
    const system = spawn();
    expect(system.update(delta, 0)).toHaveLength(0);
    expect(system.update(1000, 0)).toHaveLength(1);
  });
});
