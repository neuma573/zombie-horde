import { describe, expect, it } from 'vitest';

import {
  resolveShoveArmPose,
  resolveShoveVisualPose,
} from '../../../logic/playerVisual';

describe('player shove visual', () => {
  it('extends straight, briefly holds, and returns to ready pose', () => {
    const duration = 260;

    expect(resolveShoveVisualPose(0, duration)).toEqual({
      forwardOffset: 0,
    });
    expect(resolveShoveVisualPose(duration * 0.27, duration).forwardOffset).toBe(15);
    expect(resolveShoveVisualPose(duration * 0.4, duration).forwardOffset).toBe(15);
    expect(resolveShoveVisualPose(duration * 0.74, duration).forwardOffset).toBeCloseTo(7.5);
    expect(resolveShoveVisualPose(duration, duration)).toEqual({
      forwardOffset: 0,
    });
  });

  it('produces the same pose for the same elapsed time regardless of frame partitioning', () => {
    const singleStepElapsed = 156;
    const splitStepElapsed = [16, 20, 40, 80].reduce((total, delta) => total + delta, 0);

    expect(resolveShoveVisualPose(splitStepElapsed, 260))
      .toEqual(resolveShoveVisualPose(singleStepElapsed, 260));
  });

  it('returns the ready pose for inactive or invalid animation time', () => {
    expect(resolveShoveVisualPose(null, 260)).toEqual({ forwardOffset: 0 });
    expect(resolveShoveVisualPose(Number.NaN, 260)).toEqual({ forwardOffset: 0 });
  });
});

describe('left-arm shove pose', () => {
  it('straightens the elbow between the shoulder and extended hand at impact', () => {
    const shoulder = { x: 0, y: -8 };
    const pose = resolveShoveArmPose(
      shoulder,
      { x: 8, y: -17 },
      { x: 27, y: -5 },
      { forwardOffset: 15 },
    );
    const shoulderToHand = {
      x: pose.hand.x - shoulder.x,
      y: pose.hand.y - shoulder.y,
    };
    const shoulderToElbow = {
      x: pose.elbow.x - shoulder.x,
      y: pose.elbow.y - shoulder.y,
    };

    expect(pose.hand).toEqual({ x: 42, y: -5 });
    expect(
      shoulderToHand.x * shoulderToElbow.y
      - shoulderToHand.y * shoulderToElbow.x,
    ).toBeCloseTo(0);
    expect(Math.hypot(shoulderToElbow.x, shoulderToElbow.y))
      .toBeLessThan(Math.hypot(shoulderToHand.x, shoulderToHand.y));
  });

  it('preserves the aiming arm joints while the shove is inactive', () => {
    expect(resolveShoveArmPose(
      { x: 0, y: -8 },
      { x: 8, y: -17 },
      { x: 27, y: -5 },
      { forwardOffset: 0 },
    )).toEqual({
      elbow: { x: 8, y: -17 },
      hand: { x: 27, y: -5 },
    });
  });
});
