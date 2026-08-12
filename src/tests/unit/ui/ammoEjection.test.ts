import { describe, expect, it } from 'vitest';

import { countNewShots, createAmmoEjectionMotion, crossesReloadCue, ejectsCasingOnFire } from '../../../logic/hud';

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

describe('ejectsCasingOnFire', () => {
  it('keeps fired shotgun shells chambered until the break action opens', () => {
    expect(ejectsCasingOnFire('doubleBarrelShotgun')).toBe(false);
    expect(ejectsCasingOnFire('pistol')).toBe(true);
    expect(ejectsCasingOnFire('burstRifle')).toBe(true);
  });
});

describe('crossesReloadCue', () => {
  it('triggers extraction when reload progress crosses the sound cue', () => {
    expect(crossesReloadCue(0.57, 0.58, 0.58)).toBe(true);
    expect(crossesReloadCue(0.58, 0.7, 0.58)).toBe(false);
  });

  it('triggers an overdue extraction when reload completes in one step', () => {
    expect(crossesReloadCue(0.5, null, 0.58)).toBe(true);
    expect(crossesReloadCue(null, null, 0.58)).toBe(false);
  });
});
