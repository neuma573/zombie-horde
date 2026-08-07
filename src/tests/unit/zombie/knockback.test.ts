import { describe, expect, it } from 'vitest';

import {
  advanceKnockback,
  combineKnockbacks,
  createKnockbackState,
  remainingKnockbackDisplacement,
} from '../../../logic/knockback';

describe('zombie knockback', () => {
  it('moves quickly at first and eases to rest', () => {
    const initial = createKnockbackState({ x: 2, y: 0 }, 54, 200)!;
    const first = advanceKnockback(initial, 50);
    const second = advanceKnockback(first.state!, 50);
    const third = advanceKnockback(second.state!, 50);
    const fourth = advanceKnockback(third.state!, 50);

    expect(first.displacement.x).toBeGreaterThan(second.displacement.x);
    expect(second.displacement.x).toBeGreaterThan(third.displacement.x);
    expect(third.displacement.x).toBeGreaterThan(fourth.displacement.x);
    expect(
      first.displacement.x + second.displacement.x
      + third.displacement.x + fourth.displacement.x,
    ).toBeCloseTo(54);
    expect(fourth.state).toBeNull();
  });

  it('produces the same total displacement across frame partitions', () => {
    const initial = createKnockbackState({ x: 3, y: 4 }, 60, 200)!;
    const single = advanceKnockback(initial, 200);
    let state = initial;
    const split = { x: 0, y: 0 };
    for (const delta of [16, 17, 33, 50, 84]) {
      const step = advanceKnockback(state, delta);
      split.x += step.displacement.x;
      split.y += step.displacement.y;
      if (step.state) state = step.state;
    }

    expect(split.x).toBeCloseTo(single.displacement.x);
    expect(split.y).toBeCloseTo(single.displacement.y);
  });

  it('rejects zero-length or non-positive knockback', () => {
    expect(createKnockbackState({ x: 0, y: 0 }, 54, 200)).toBeNull();
    expect(createKnockbackState({ x: 1, y: 0 }, 0, 200)).toBeNull();
    expect(createKnockbackState({ x: 1, y: 0 }, 54, 0)).toBeNull();
  });

  it('preserves remaining displacement when another shove lands', () => {
    const initial = createKnockbackState({ x: 1, y: 0 }, 54, 210)!;
    const partial = advanceKnockback(initial, 70).state!;
    const added = createKnockbackState({ x: 1, y: 0 }, 54, 210)!;
    const remaining = remainingKnockbackDisplacement(partial);
    const combined = combineKnockbacks(partial, added);

    expect(combined.direction).toEqual({ x: 1, y: 0 });
    expect(combined.distance).toBeCloseTo(remaining.x + 54);
  });

  it('combines knockbacks as vectors when their directions differ', () => {
    const current = createKnockbackState({ x: 1, y: 0 }, 40, 200)!;
    const added = createKnockbackState({ x: 0, y: 1 }, 30, 200)!;
    const combined = combineKnockbacks(current, added);

    expect(combined.distance).toBeCloseTo(50);
    expect(combined.direction.x).toBeCloseTo(0.8);
    expect(combined.direction.y).toBeCloseTo(0.6);
  });
});
