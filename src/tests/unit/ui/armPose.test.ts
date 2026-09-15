import { describe, expect, it } from 'vitest';
import { resolveArmPose } from '../../../logic/armPose';
import { resolveOneHandedMeleePose } from '../../../logic/playerVisual';
import { MELEE_MOTION } from '../../../config/meleeMotionConfig';

describe('melee arm anatomy', () => {
  it.each([-14.5, 14.5])('keeps the guard elbow close to shoulder %s without shortening either bone', (y) => {
    const shoulder = { x: 2, y };
    const arm = resolveArmPose(shoulder, { x: 24, y: y < 0 ? -11 : 14 }, 12, 16, y < 0 ? -1 : 1, 0.55);
    expect(Math.abs(arm.elbow.y - shoulder.y)).toBeLessThan(4);
    expect(arm.hand.x).toBeGreaterThan(28);
    expect(Math.hypot(arm.elbow.x - shoulder.x, arm.elbow.y - shoulder.y)).toBeCloseTo(12);
    expect(Math.hypot(arm.hand.x - arm.elbow.x, arm.hand.y - arm.elbow.y)).toBeCloseTo(16);
  });
  it.each([-14.5, -8, 9, 14.5])('preserves both bone lengths through the swing from shoulder %s', (y) => {
    const shoulder = { x: 2, y };
    for (let elapsed = 0; elapsed <= MELEE_MOTION.durationMs; elapsed += 2) {
      const pose = resolveOneHandedMeleePose(elapsed, MELEE_MOTION.durationMs);
      const arm = resolveArmPose(shoulder, y < 0 ? pose.leftHand : pose.rightHand,
        MELEE_MOTION.upperArmLength, MELEE_MOTION.forearmLength, y < 0 ? -1 : 1);
      expect(Math.hypot(arm.elbow.x - shoulder.x, arm.elbow.y - shoulder.y)).toBeCloseTo(MELEE_MOTION.upperArmLength);
      expect(Math.hypot(arm.hand.x - arm.elbow.x, arm.hand.y - arm.elbow.y)).toBeCloseTo(MELEE_MOTION.forearmLength);
    }
  });

  it.each([{ x: 0, y: 0 }, { x: 1000, y: 0 }])('keeps an unreachable target finite without stretching', (target) => {
    const arm = resolveArmPose({ x: 0, y: 0 }, target, 18, 19, 1);
    expect(Math.hypot(arm.elbow.x, arm.elbow.y)).toBeCloseTo(18);
    expect(Math.hypot(arm.hand.x - arm.elbow.x, arm.hand.y - arm.elbow.y)).toBeCloseTo(19);
  });

  it.each([0.28, 0.42, 0.64, 1])('connects poses continuously at progress %s', (progress) => {
    const at = progress * MELEE_MOTION.durationMs;
    const before = resolveOneHandedMeleePose(at - 0.001, MELEE_MOTION.durationMs);
    const after = resolveOneHandedMeleePose(at + 0.001, MELEE_MOTION.durationMs);
    expect(Math.hypot(after.rightHand.x - before.rightHand.x, after.rightHand.y - before.rightHand.y)).toBeLessThan(0.01);
    expect(Math.abs(after.weaponRotation - before.weaponRotation)).toBeLessThan(0.01);
  });
});
