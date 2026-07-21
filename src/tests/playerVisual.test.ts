import { describe, expect, it } from 'vitest';

import { resolveSidearmPose, SIDEARM_VISUAL } from '../logic/playerVisual';

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
