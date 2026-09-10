import { describe, expect, it } from 'vitest';

import {
  blendVisualColor,
  clampPonytailRelativeRotation,
  muzzleLightExposure,
  RIFLE_VISUAL,
  resolveOneHandedMeleeActionPose,
  resolveActionFacingRotation,
  resolveOneHandedMeleePose,
  resolveSystemaMeleeShovePose,
  resolveRifleReloadVisual,
  resolveShotgunBreakAngle,
  resolveSidearmHandPose,
  resolveSidearmPose,
  SIDEARM_VISUAL,
} from '../../../logic/playerVisual';

describe('ponytail rotation', () => {
  it('keeps rapid aim reversals inside the rear hemisphere', () => {
    const maximumLag = Math.PI * 0.4;

    expect(clampPonytailRelativeRotation(Math.PI, 0, maximumLag))
      .toBeCloseTo(-maximumLag);
    expect(clampPonytailRelativeRotation(0, Math.PI, maximumLag))
      .toBeCloseTo(maximumLag);
  });

  it('preserves small lag and clamps invalid inputs safely', () => {
    expect(clampPonytailRelativeRotation(0.5, 0.7, Math.PI * 0.4))
      .toBeCloseTo(0.2);
    expect(clampPonytailRelativeRotation(Number.NaN, 0, Math.PI * 0.4))
      .toBe(0);
    expect(clampPonytailRelativeRotation(0, Math.PI, Number.NaN))
      .toBe(0);
  });
});

describe('player visual pose', () => {
  it('faces a queued melee swing until the swing ends', () => {
    const latestAim = { x: 0, y: 1 };
    const queuedSwingAim = { x: 1, y: 0 };

    expect(resolveActionFacingRotation(latestAim, queuedSwingAim, null)).toBeCloseTo(0);
    expect(resolveActionFacingRotation(latestAim, null, null)).toBeCloseTo(Math.PI / 2);
  });

  it('faces a queued ranged shot for its rendered frame', () => {
    const latestAim = { x: 0, y: 1 };
    const queuedShotAim = { x: 1, y: 0 };

    expect(resolveActionFacingRotation(latestAim, null, queuedShotAim)).toBeCloseTo(0);
    expect(resolveActionFacingRotation(latestAim, null, null)).toBeCloseTo(Math.PI / 2);
  });

  it('swings a one-handed melee weapon with the right arm', () => {
    const ready = resolveOneHandedMeleePose(null, 360);
    const windup = resolveOneHandedMeleePose(101, 360);
    const impact = resolveOneHandedMeleePose(202, 360);

    expect(windup.rightHand.y).toBeGreaterThan(ready.rightHand.y);
    expect(impact.rightHand.x).toBeGreaterThan(ready.rightHand.x);
    expect(impact.rightHand.y).toBeLessThan(ready.rightHand.y);
    expect(impact.weaponRotation).toBeLessThan(ready.weaponRotation);
  });

  it('keeps the left hand nearly still during a one-handed melee swing', () => {
    const ready = resolveOneHandedMeleePose(null, 360);
    const impact = resolveOneHandedMeleePose(202, 360);

    expect(Math.hypot(
      impact.leftHand.x - ready.leftHand.x,
      impact.leftHand.y - ready.leftHand.y,
    )).toBeLessThanOrEqual(2);
    expect(Math.hypot(
      impact.rightHand.x - ready.rightHand.x,
      impact.rightHand.y - ready.rightHand.y,
    )).toBeGreaterThan(15);
  });

  it('keeps the resting left hand visibly ahead of the body', () => {
    const ready = resolveOneHandedMeleePose(null, 360);

    expect(ready.leftHand.x).toBeGreaterThan(15);
    expect(Math.abs(ready.leftHand.y)).toBeGreaterThan(10);
  });

  it('pushes with the open left hand while keeping the baton aimed', () => {
    const ready = resolveSystemaMeleeShovePose(null, 260);
    const extended = resolveSystemaMeleeShovePose(70, 260);

    expect(ready.weaponRotation).toBe(0);
    expect(extended.weaponRotation).toBe(ready.weaponRotation);
    expect(extended.leftHand.x).toBeGreaterThan(ready.leftHand.x + 10);
    expect(Math.abs(extended.rightHand.x - ready.rightHand.x)).toBeLessThanOrEqual(2);
    expect(extended.rightHand.y).toBe(ready.rightHand.y);
    expect(resolveSystemaMeleeShovePose(260, 260)).toEqual(ready);
  });

  it('combines a shove extension with an active baton swing', () => {
    const swing = resolveOneHandedMeleePose(250, 360);
    const shove = resolveSystemaMeleeShovePose(70, 260);

    const combined = resolveOneHandedMeleeActionPose(250, 360, 70, 260);

    expect(combined.leftHand).toEqual(shove.leftHand);
    expect(combined.leftElbow).toEqual(shove.leftElbow);
    expect(combined.rightHand).toEqual(swing.rightHand);
    expect(combined.rightElbow).toEqual(swing.rightElbow);
    expect(combined.weaponPosition).toEqual(swing.weaponPosition);
    expect(combined.weaponRotation).toBe(swing.weaponRotation);
  });

  it('opens and closes the shotgun barrels during a break-action reload', () => {
    expect(resolveShotgunBreakAngle(false, 0.5)).toBe(0);
    expect(resolveShotgunBreakAngle(true, 0)).toBe(0);
    expect(resolveShotgunBreakAngle(true, 0.22)).toBeCloseTo(0.82);
    expect(resolveShotgunBreakAngle(true, 0.6)).toBeCloseTo(0.82);
    expect(resolveShotgunBreakAngle(true, 0.94)).toBeGreaterThan(0);
    expect(resolveShotgunBreakAngle(true, 1)).toBeCloseTo(0);
  });

  it('extends the right arm toward the pistol while the left hand supports it', () => {
    const pose = resolveSidearmHandPose(SIDEARM_VISUAL.readyPose);
    const shoulder = { x: 2, y: 10 };
    const fullArm = {
      x: pose.rightHand.x - shoulder.x,
      y: pose.rightHand.y - shoulder.y,
    };
    const upperArm = {
      x: pose.rightElbow.x - shoulder.x,
      y: pose.rightElbow.y - shoulder.y,
    };
    const cross = fullArm.x * upperArm.y - fullArm.y * upperArm.x;

    expect(Math.abs(cross)).toBeLessThan(1e-8);
    expect(pose.rightHand.x).toBeGreaterThan(pose.rightElbow.x);
    expect(pose.leftHand.x).toBeCloseTo(pose.rightHand.x);
    expect(pose.leftHand.y).toBeLessThan(pose.rightHand.y);
    expect(Math.abs(pose.rightHand.y - shoulder.y)).toBeLessThan(
      Math.abs(pose.leftHand.y - (-9)),
    );
  });

  it('keeps the pistol arm straight from a widened shoulder pose', () => {
    const shoulder = { x: 2, y: 14.5 };
    const pose = resolveSidearmHandPose(SIDEARM_VISUAL.readyPose, {
      leftY: -14.5,
      rightY: shoulder.y,
    });
    const fullArm = {
      x: pose.rightHand.x - shoulder.x,
      y: pose.rightHand.y - shoulder.y,
    };
    const upperArm = {
      x: pose.rightElbow.x - shoulder.x,
      y: pose.rightElbow.y - shoulder.y,
    };

    expect(fullArm.x * upperArm.y - fullArm.y * upperArm.x)
      .toBeCloseTo(0);
  });

  it('places the rifle support hand ahead of the trigger hand', () => {
    expect(RIFLE_VISUAL.leftHand.x).toBeGreaterThan(RIFLE_VISUAL.rightHand.x);
    expect(RIFLE_VISUAL.rightHand.x).toBeLessThan(RIFLE_VISUAL.readyPose.x);
    expect(RIFLE_VISUAL.readyPose.y).toBeGreaterThan(0);
  });

  it('moves the right hand through magazine insertion and charging phases', () => {
    const drawMagazine = resolveRifleReloadVisual(true, 0.12);
    const insertMagazine = resolveRifleReloadVisual(true, 0.45);
    const reachChargingHandle = resolveRifleReloadVisual(true, 0.7);
    const pullChargingHandle = resolveRifleReloadVisual(true, 0.88);

    expect(drawMagazine.rightHand.y).toBeGreaterThan(RIFLE_VISUAL.rightHand.y);
    expect(insertMagazine.magazine.visible).toBe(true);
    expect(reachChargingHandle.rightHand.y).toBeLessThan(0);
    expect(pullChargingHandle.chargingHandleOffset).toBeLessThan(0);
  });

  it('returns the rifle and both hands to ready after reloading', () => {
    const completed = resolveRifleReloadVisual(true, 1);

    expect(completed.pose.x).toBeCloseTo(RIFLE_VISUAL.readyPose.x);
    expect(completed.pose.y).toBeCloseTo(RIFLE_VISUAL.readyPose.y);
    expect(completed.leftHand.x).toBeCloseTo(RIFLE_VISUAL.leftHand.x);
    expect(completed.rightHand.x).toBeCloseTo(RIFLE_VISUAL.rightHand.x);
    expect(completed.magazine.visible).toBe(false);
  });

  it('moves the rifle and support hand to the left-side reload guard', () => {
    const guarded = resolveRifleReloadVisual(true, 0.5);
    const support = RIFLE_VISUAL.supportPoint;
    const cos = Math.cos(guarded.pose.rotation);
    const sin = Math.sin(guarded.pose.rotation);

    expect(guarded.pose.y).toBeLessThan(0);
    expect(guarded.pose.rotation).toBeLessThan(-0.2);
    expect(guarded.leftHand.y).toBeLessThan(0);
    expect(guarded.leftHand.x).toBeCloseTo(
      guarded.pose.x - RIFLE_VISUAL.readyPose.x
        + support.x * cos - support.y * sin,
    );
    expect(guarded.leftHand.y).toBeCloseTo(
      guarded.pose.y + support.x * sin + support.y * cos,
    );
  });

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
