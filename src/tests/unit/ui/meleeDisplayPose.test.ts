import { describe, expect, it } from 'vitest';
import { MELEE_MOTION } from '../../../config/meleeMotionConfig';
import { resolveMeleeDisplayPose } from '../../../logic/meleeDisplayPose';
import { resolveOneHandedMeleePose } from '../../../logic/playerVisual';

const appearances = [
  { leftY: -14.5, rightY: 14.5 },
  { leftY: -8, rightY: 9 },
];

describe('melee display pose', () => {
  it.each([0, 0.14, 0.28, 0.42, 0.64, 0.9, 1])('preserves the same weapon aim across appearances at progress %s', (progress) => {
    const source = resolveOneHandedMeleePose(progress * MELEE_MOTION.durationMs, MELEE_MOTION.durationMs);
    const [male, female] = appearances.map(shoulders => resolveMeleeDisplayPose(source, shoulders, progress, false));
    expect(male.weaponRotation).toBeCloseTo(female.weaponRotation);
    expect(male.weaponPosition).toEqual(male.rightHand);
    expect(female.weaponPosition).toEqual(female.rightHand);
  });

  it.each(appearances)('rests the free hand behind and inside the weapon hand for shoulders $leftY / $rightY', (shoulders) => {
    const source = resolveOneHandedMeleePose(null, MELEE_MOTION.durationMs);
    const pose = resolveMeleeDisplayPose(source, shoulders, null, false);
    expect(pose.leftHand.x).toBeLessThan(pose.rightHand.x - 1);
    expect(Math.abs(pose.leftHand.y)).toBeLessThan(Math.abs(source.leftHand.y));
    expect(Math.abs(pose.leftElbow.y - shoulders.leftY)).toBeLessThan(6);
    for (const side of ['left', 'right'] as const) {
      const elbow = pose[`${side}Elbow`];
      const hand = pose[`${side}Hand`];
      expect(Math.hypot(elbow.x - 2, elbow.y - shoulders[`${side}Y`])).toBeCloseTo(MELEE_MOTION.upperArmLength);
      expect(Math.hypot(hand.x - elbow.x, hand.y - elbow.y)).toBeCloseTo(MELEE_MOTION.forearmLength);
    }
  });

  it.each(appearances)('returns continuously to the idle guard for shoulders $leftY / $rightY', (shoulders) => {
    const idle = resolveMeleeDisplayPose(resolveOneHandedMeleePose(null, 360), shoulders, null, false);
    const start = resolveMeleeDisplayPose(resolveOneHandedMeleePose(0, 360), shoulders, 0, false);
    const end = resolveMeleeDisplayPose(resolveOneHandedMeleePose(360, 360), shoulders, 1, false);
    expect(start).toEqual(idle);
    expect(end).toEqual(idle);
  });
});
