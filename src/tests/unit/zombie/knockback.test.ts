import { describe, expect, it } from 'vitest';

import { advanceKnockback, createKnockbackState } from '../../../logic/knockback';

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
});
