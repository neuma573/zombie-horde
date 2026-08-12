import { describe, expect, it } from 'vitest';

import {
  advanceDelayedGauge,
  createDelayedGaugeState,
  DELAYED_GAUGE_HOLD_MS,
} from '../../../effects/delayedGauge';

describe('delayed health gauge', () => {
  it('holds damage briefly before following the actual health', () => {
    const damaged = advanceDelayedGauge(createDelayedGaugeState(1), 0.4, 0);
    const held = advanceDelayedGauge(damaged, 0.4, DELAYED_GAUGE_HOLD_MS);
    const trailing = advanceDelayedGauge(held, 0.4, 180);

    expect(held.displayedRatio).toBe(1);
    expect(trailing.displayedRatio).toBeCloseTo(0.8);
  });

  it('applies recovery immediately without a trailing gap', () => {
    const damaged = advanceDelayedGauge(createDelayedGaugeState(1), 0.4, 500);
    const recovered = advanceDelayedGauge(damaged, 0.75, 16);

    expect(recovered).toEqual(createDelayedGaugeState(0.75));
  });

  it('resets the hold when more damage arrives', () => {
    const damaged = advanceDelayedGauge(createDelayedGaugeState(1), 0.7, 200);
    const damagedAgain = advanceDelayedGauge(damaged, 0.5, 200);

    expect(damagedAgain.displayedRatio).toBe(1);
    expect(damagedAgain.delayRemainingMs).toBe(DELAYED_GAUGE_HOLD_MS);
  });

  it('does not charge the frame delta before damage is observed', () => {
    const initial = createDelayedGaugeState(1);
    const afterLongFrame = advanceDelayedGauge(initial, 0.4, 500);
    const afterShortFrame = advanceDelayedGauge(initial, 0.4, 16);

    expect(afterLongFrame).toEqual(afterShortFrame);
    expect(afterLongFrame.displayedRatio).toBe(1);
    expect(afterLongFrame.delayRemainingMs).toBe(DELAYED_GAUGE_HOLD_MS);
  });

  it('produces the same result for split and unsplit frame time', () => {
    const initial = advanceDelayedGauge(createDelayedGaugeState(1), 0.2, 0);
    const single = advanceDelayedGauge(initial, 0.2, 750);
    const split = [250, 250, 250].reduce(
      (state, deltaMs) => advanceDelayedGauge(state, 0.2, deltaMs),
      initial,
    );

    expect(split.displayedRatio).toBeCloseTo(single.displayedRatio);
    expect(split.delayRemainingMs).toBe(single.delayRemainingMs);
  });
});
