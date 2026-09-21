import { describe, expect, it } from 'vitest';
import { ZOMBIE_CONFIG } from '../../../config/zombieConfig';
import { movePursuingZombie } from '../../../logic/zombiePursuit';

const origin = { x: 100, y: 100 };
const noCrowd = { x: 0, y: 0 };

function pursue(steps: readonly number[], kind: 'normal' | 'fast' = 'fast') {
  let position = { ...origin };
  const distances: number[] = [];
  for (const deltaMs of steps) {
    const next = movePursuingZombie({ id: 'runner-42', kind, position },
      { x: 100000, y: 100 }, noCrowd, deltaMs, ZOMBIE_CONFIG);
    distances.push(next.x - position.x);
    position = next;
  }
  return { position, distances };
}

describe('zombie pursuit', () => {
  it.each([100, 259, 260, 261, 10000])('runs immediately at target distance %s without a proximity trigger', distance => {
    const next = movePursuingZombie({ id: 'runner-42', kind: 'fast', position: origin },
      { x: origin.x + distance, y: origin.y }, noCrowd, 16, ZOMBIE_CONFIG);
    expect(next.x - origin.x).toBeGreaterThanOrEqual(3.2);
    expect(next.x - origin.x).toBeLessThanOrEqual(4.8);
    expect(next.y).toBe(origin.y);
  });

  it('preserves individual speed when the target moves between near and far range', () => {
    let position = { ...origin };
    const distances: number[] = [];
    for (const distance of [10000, 100, 10000]) {
      const next = movePursuingZombie({ id: 'runner-42', kind: 'fast', position },
        { x: position.x + distance, y: position.y }, noCrowd, 16, ZOMBIE_CONFIG);
      distances.push(next.x - position.x);
      position = next;
    }
    expect(distances[0]).toBeGreaterThanOrEqual(3.2);
    expect(distances[1]).toBeCloseTo(distances[0]);
    expect(distances[2]).toBeCloseTo(distances[0]);
  });

  it('keeps running before and after the former one-second activation boundary', () => {
    const result = pursue([999, 1, 1]);
    const speeds = result.distances.map((distance, i) => distance / [0.999, 0.001, 0.001][i]);
    expect(speeds[0]).toBeGreaterThanOrEqual(200);
    expect(speeds[0]).toBeLessThanOrEqual(300);
    expect(speeds[1]).toBeCloseTo(speeds[0]);
    expect(speeds[2]).toBeCloseTo(speeds[0]);
  });

  it('keeps the same running speed through former run and cooldown periods', () => {
    // Re-evaluate the production pursuit step throughout a minute of movement.
    const { distances } = pursue(Array.from({ length: 600 }, () => 100));
    for (const distance of distances) {
      expect(distance).toBeGreaterThanOrEqual(20);
      expect(distance).toBeLessThanOrEqual(30);
      expect(distance).toBeCloseTo(distances[0]);
    }
  });

  it('travels the same distance for split and combined elapsed time', () => {
    const combined = pursue([2400]);
    const split = pursue([800, 1600]);
    const frames = pursue(Array.from({ length: 144 }, () => 2400 / 144));
    expect(combined.position.x - origin.x).toBeGreaterThanOrEqual(480);
    expect(combined.position.x - origin.x).toBeLessThanOrEqual(720);
    expect(split.position.x).toBeCloseTo(combined.position.x);
    expect(frames.position.x).toBeCloseTo(combined.position.x);
    expect(split.position.y).toBe(combined.position.y);
  });

  it('keeps normal zombies at walking speed throughout the same pursuit', () => {
    const result = pursue([999, 1, 1500, 3000, 2000, 10000], 'normal');
    expect(result.position.x - origin.x).toBeCloseTo(1750);
  });

  it('stops at the target instead of overshooting at running speed', () => {
    const target = { x: 101, y: 100 };
    expect(movePursuingZombie({ id: 'runner-42', kind: 'fast', position: origin },
      target, noCrowd, 1000, ZOMBIE_CONFIG)).toEqual(target);
  });

  it.each([0, -1, NaN, Infinity])('does not move for invalid delta %s', deltaMs => {
    expect(pursue([deltaMs]).position).toEqual(origin);
  });
});
