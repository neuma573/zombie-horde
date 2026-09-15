import { describe, expect, it } from 'vitest';
import { advanceMeleeSwing } from '../../../logic/meleeSwing';
import { MELEE_MOTION } from '../../../config/meleeMotionConfig';

const contact = MELEE_MOTION.durationMs * MELEE_MOTION.impactProgress;

describe('melee contact timing', () => {
  it('waits through preparation and emits contact exactly once', () => {
    const before = advanceMeleeSwing(0, contact - 1);
    expect(before.impactOffsetMs).toBeNull();
    const hit = advanceMeleeSwing(before.elapsedMs, 1);
    expect(hit.impactOffsetMs).toBeCloseTo(1);
    expect(advanceMeleeSwing(hit.elapsedMs, 1).impactOffsetMs).toBeNull();
  });
  it('preserves contact time across frame partitions and a large frame', () => {
    const simulate = (steps: number[]) => {
      let elapsed: number | null = 0;
      let time = 0;
      const hits: number[] = [];
      for (const delta of steps) {
        const next = advanceMeleeSwing(elapsed, delta);
        if (next.impactOffsetMs !== null) hits.push(time + next.impactOffsetMs);
        elapsed = next.elapsedMs;
        time += delta;
      }
      return { elapsed, hits };
    };
    const once = simulate([400]);
    const split = simulate(Array(40).fill(10));
    expect(once.elapsed).toBeNull();
    expect(split.elapsed).toBeNull();
    expect(once.hits).toHaveLength(1);
    expect(split.hits).toHaveLength(1);
    expect(once.hits[0]).toBeCloseTo(contact);
    expect(split.hits[0]).toBeCloseTo(contact);
  });
  it.each([0, -1, NaN])('does not advance on invalid delta %s', (delta) => {
    expect(advanceMeleeSwing(20, delta)).toEqual({ elapsedMs: 20, impactOffsetMs: null });
  });
  it('does not emit contact after cancellation', () => {
    expect(advanceMeleeSwing(null, 400)).toEqual({ elapsedMs: null, impactOffsetMs: null });
  });
});
