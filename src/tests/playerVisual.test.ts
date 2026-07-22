import { describe, expect, it } from 'vitest';

import {
  blendVisualColor,
  muzzleLightExposure,
  resolveSidearmPose,
  SIDEARM_VISUAL,
} from '../logic/playerVisual';

describe('player visual pose', () => {
  it('uses the ready pose outside reload', () => {
    expect(resolveSidearmPose(false, 0.5)).toEqual(SIDEARM_VISUAL.readyPose);
  });

  it('moves to the reload pose at the middle of reload', () => {
    expect(resolveSidearmPose(true, 0.5)).toEqual(SIDEARM_VISUAL.reloadPose);
  });

  it('returns smoothly to ready at reload completion', () => {
    expect(resolveSidearmPose(true, 0)).toEqual(SIDEARM_VISUAL.readyPose);
    const completed = resolveSidearmPose(true, 1);

    expect(completed.x).toBeCloseTo(SIDEARM_VISUAL.readyPose.x);
    expect(completed.y).toBeCloseTo(SIDEARM_VISUAL.readyPose.y);
    expect(completed.rotation).toBeCloseTo(SIDEARM_VISUAL.readyPose.rotation);
  });

  it('clamps invalid progress without producing non-finite values', () => {
    for (const progress of [-1, 2, Number.NaN, Number.POSITIVE_INFINITY]) {
      const pose = resolveSidearmPose(true, progress);
      expect(Number.isFinite(pose.x)).toBe(true);
      expect(Number.isFinite(pose.y)).toBe(true);
      expect(Number.isFinite(pose.rotation)).toBe(true);
    }
  });
});

describe('muzzle light exposure', () => {
  it('favors nearby objects along the shot direction', () => {
    const near = muzzleLightExposure({ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 40, y: 0 }, 200, Math.PI / 6);
    const far = muzzleLightExposure({ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 160, y: 0 }, 200, Math.PI / 6);

    expect(near).toBeGreaterThan(far);
    expect(far).toBeGreaterThan(0);
  });

  it('does not illuminate objects behind or outside the beam', () => {
    expect(muzzleLightExposure({ x: 0, y: 0 }, { x: 1, y: 0 }, { x: -10, y: 0 }, 200, Math.PI / 6)).toBe(0);
    expect(muzzleLightExposure({ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 40, y: 80 }, 200, Math.PI / 6)).toBe(0);
    expect(muzzleLightExposure({ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 201, y: 0 }, 200, Math.PI / 6)).toBe(0);
  });
});

describe('player muzzle reflection color', () => {
  it('blends from the base color to the reflected color', () => {
    expect(blendVisualColor(0x000000, 0xffffff, 0)).toBe(0x000000);
    expect(blendVisualColor(0x000000, 0xffffff, 0.5)).toBe(0x808080);
    expect(blendVisualColor(0x000000, 0xffffff, 1)).toBe(0xffffff);
  });

  it('clamps invalid reflection intensities', () => {
    expect(blendVisualColor(0x112233, 0xaabbcc, -1)).toBe(0x112233);
    expect(blendVisualColor(0x112233, 0xaabbcc, 2)).toBe(0xaabbcc);
    expect(blendVisualColor(0x112233, 0xaabbcc, Number.NaN)).toBe(0x112233);
  });
});
