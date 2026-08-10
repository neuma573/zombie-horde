import { describe, expect, it } from 'vitest';

import { countNewShots, createAmmoEjectionMotion } from '../../../logic/hud';

describe('createAmmoEjectionMotion', () => {
  it('varies cartridge travel and spin within bounded screen-safe ranges', () => {
    const low = createAmmoEjectionMotion(0, 0, 0);
    const high = createAmmoEjectionMotion(1, 1, 1);

    expect(low.xDelta).toBe(-34);
    expect(high.xDelta).toBe(-58);
    expect(low.yDelta).toBe(-24);
    expect(high.yDelta).toBe(18);
    expect(low.angleDelta).toBe(-200);
    expect(high.angleDelta).toBe(200);
    expect(low.durationMs).toBe(360);
    expect(high.durationMs).toBe(460);
  });

  it('returns the same motion for the same injected random samples', () => {
    const first = createAmmoEjectionMotion(0.25, 0.75, 0.4);

    const second = createAmmoEjectionMotion(0.25, 0.75, 0.4);

    expect(second).toEqual(first);
    expect(first.fadeDelayMs).toBeLessThan(first.durationMs);
  });
});

describe('countNewShots', () => {
  it('counts only explicit shot sequence advances', () => {
    expect(countNewShots(12, 13)).toBe(1);
    expect(countNewShots(12, 12)).toBe(0);
    expect(countNewShots(undefined, 12)).toBe(0);
  });

  it('does not report a shot when a restarted sequence decreases', () => {
    expect(countNewShots(12, 0)).toBe(0);
  });
});
