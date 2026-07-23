import { describe, expect, it } from 'vitest';

import { resolveHumanoidDeathPose } from '../logic/humanoidDeathPose';

describe('humanoid death pose', () => {
  it('selects a deterministic pose independent of render timing', () => {
    expect(resolveHumanoidDeathPose('zombie-12', 1))
      .toEqual(resolveHumanoidDeathPose('zombie-12', 1));
  });

  it('provides more than one shared humanoid death variant', () => {
    const variants = new Set(
      Array.from({ length: 20 }, (_, index) => (
        resolveHumanoidDeathPose(`entity-${index}`, 1).variant
      )),
    );

    expect(variants).toEqual(new Set(['spread', 'side']));
  });

  it('uses a wide spread silhouette for the first storyboard pose', () => {
    for (let index = 0; index < 20; index += 1) {
      const pose = resolveHumanoidDeathPose(`entity-${index}`, -1);
      if (pose.variant !== 'spread') continue;

      expect(Math.abs(pose.upperLeg.rotation - pose.lowerLeg.rotation)).toBeGreaterThan(0.1);
      expect(pose.upperArm.rotation).toBeCloseTo(-Math.PI / 2);
      expect(pose.lowerArm.rotation).toBeCloseTo(Math.PI / 2);
      expect(pose.head.x).toBeGreaterThan(pose.torso.x);
    }
  });

  it('overlaps both legs in the side-fall storyboard pose', () => {
    for (let index = 0; index < 20; index += 1) {
      const pose = resolveHumanoidDeathPose(`entity-${index}`, 1);
      if (pose.variant !== 'side') continue;

      expect(Math.abs(pose.upperLeg.y - pose.lowerLeg.y)).toBeLessThanOrEqual(2);
      expect(Math.abs(pose.upperLeg.rotation - pose.lowerLeg.rotation)).toBeLessThan(0.05);
      expect(Math.sign(pose.upperArm.rotation)).toBe(Math.sign(pose.lowerArm.rotation));
    }
  });
});
