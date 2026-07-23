import { describe, expect, it } from 'vitest';

import {
  advanceZombieHitReaction,
  createZombieHitReaction,
  resolveZombieHitReactionPose,
  type ZombieHitReactionConfig,
} from '../logic/zombieHitFeedback';

const config: ZombieHitReactionConfig = {
  durationMs: 180,
  recoilDistance: 7,
  recoilRotationRadians: 0.13,
};

describe('zombie hit feedback', () => {
  it('converts the world impact direction into zombie-local recoil', () => {
    const state = createZombieHitReaction({ x: 1, y: 0 }, Math.PI / 2, config);

    expect(state.localDirection.x).toBeCloseTo(0);
    expect(state.localDirection.y).toBeCloseTo(-1);
    expect(resolveZombieHitReactionPose(state, config).offset.y).toBeCloseTo(-7);
  });

  it('decays body and arm recoil using elapsed milliseconds', () => {
    const initial = createZombieHitReaction({ x: 1, y: 0 }, 0, config);
    const halfway = advanceZombieHitReaction(initial, 90);
    const initialPose = resolveZombieHitReactionPose(initial, config);
    const halfwayPose = resolveZombieHitReactionPose(halfway, config);

    expect(halfwayPose.offset.x).toBeLessThan(initialPose.offset.x);
    expect(Math.abs(halfwayPose.upperArmOffset.y))
      .toBeLessThan(Math.abs(initialPose.upperArmOffset.y));
    expect(Math.abs(halfwayPose.lowerArmOffset.y))
      .toBeLessThan(Math.abs(initialPose.lowerArmOffset.y));
    expect(advanceZombieHitReaction(halfway, 90)).toBeNull();
  });

  it('is independent of delta partitioning', () => {
    const initial = createZombieHitReaction({ x: 3, y: 4 }, 0.4, config);
    const whole = advanceZombieHitReaction(initial, 120);
    const split = advanceZombieHitReaction(
      advanceZombieHitReaction(initial, 40),
      80,
    );

    expect(split).toEqual(whole);
    expect(resolveZombieHitReactionPose(split, config))
      .toEqual(resolveZombieHitReactionPose(whole, config));
  });

  it('keeps invalid direction and timing inputs finite', () => {
    const state = createZombieHitReaction(
      { x: Number.NaN, y: Number.POSITIVE_INFINITY },
      Number.NaN,
      config,
    );
    const pose = resolveZombieHitReactionPose(state, {
      durationMs: Number.NaN,
      recoilDistance: Number.POSITIVE_INFINITY,
      recoilRotationRadians: Number.NaN,
    });

    expect(state.localDirection).toEqual({ x: 1, y: 0 });
    expect(pose).toEqual({
      offset: { x: 0, y: 0 },
      rotation: 0,
      upperArmOffset: { x: 0, y: 0 },
      lowerArmOffset: { x: 0, y: 0 },
    });
  });
});
