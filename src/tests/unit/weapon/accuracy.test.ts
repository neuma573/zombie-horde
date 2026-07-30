import { describe, expect, it } from 'vitest';

import { advanceFirstShotAccuracy, applyWeaponRecoil, createFirstShotAccuracyState, consumeFirstShotAccuracy, FIRST_SHOT_ACCURACY, weaponSpreadDegrees } from '../../../logic/weapon';
import { BURST_RIFLE_WEAPON, PISTOL_WEAPON } from '../../../config/weaponConfig';

describe('weapon accuracy', () => {
  it('applies deterministic weapon recoil without changing direction length', () => {
    const first = applyWeaponRecoil({ x: 1, y: 0 }, 4, 0, 42);
    const second = applyWeaponRecoil({ x: 1, y: 0 }, 4, 1, 42);

    expect(first).not.toEqual(second);
    expect(Math.hypot(first.x, first.y)).toBeCloseTo(1);
    expect(Math.hypot(second.x, second.y)).toBeCloseTo(1);
    expect(applyWeaponRecoil({ x: 1, y: 0 }, 4, 0, 42)).toEqual(first);
    expect(applyWeaponRecoil({ x: 1, y: 0 }, 4, 0, 7)).not.toEqual(first);
  });

  it('restores first-shot accuracy only after the recoil reset delay', () => {
    const initial = consumeFirstShotAccuracy(createFirstShotAccuracyState());
    const immediate = consumeFirstShotAccuracy(initial.state);
    const almostRecovered = advanceFirstShotAccuracy(
      immediate.state,
      FIRST_SHOT_ACCURACY.resetDelayMs - 1,
    );
    const early = consumeFirstShotAccuracy(almostRecovered);
    const recovered = consumeFirstShotAccuracy(advanceFirstShotAccuracy(
      early.state,
      FIRST_SHOT_ACCURACY.resetDelayMs,
    ));

    expect(initial.isAccurateFirstShot).toBe(true);
    expect(immediate.isAccurateFirstShot).toBe(false);
    expect(early.isAccurateFirstShot).toBe(false);
    expect(recovered.isAccurateFirstShot).toBe(true);
  });

  it('substantially reduces recoil deviation for an accurate first shot', () => {
    const regular = applyWeaponRecoil({ x: 1, y: 0 }, 7, 4, 42);
    const accurate = applyWeaponRecoil(
      { x: 1, y: 0 },
      7 * FIRST_SHOT_ACCURACY.recoilMultiplier,
      4,
      42,
    );

    expect(Math.abs(Math.atan2(accurate.y, accurate.x))).toBeLessThan(
      Math.abs(Math.atan2(regular.y, regular.x)),
    );
  });

  it('makes the rifle first shot more accurate than the pistol first shot', () => {
    const pistolSpread = weaponSpreadDegrees(PISTOL_WEAPON, 0, true);
    const rifleSpread = weaponSpreadDegrees(BURST_RIFLE_WEAPON, 0, true);

    expect(rifleSpread).toBeLessThan(pistolSpread);
  });

  it('increases rifle spread across a burst while keeping it capped', () => {
    const first = weaponSpreadDegrees(BURST_RIFLE_WEAPON, 0, true);
    const second = weaponSpreadDegrees(BURST_RIFLE_WEAPON, 1, false);
    const third = weaponSpreadDegrees(BURST_RIFLE_WEAPON, 2, false);
    const sustained = weaponSpreadDegrees(BURST_RIFLE_WEAPON, 100, false);

    expect(second).toBeGreaterThan(first);
    expect(third).toBeGreaterThan(second);
    expect(sustained).toBe(BURST_RIFLE_WEAPON.accuracy.maxSpreadDegrees);
  });

  it('gives the rifle a wider recoil deviation than the pistol', () => {
    const pistol = applyWeaponRecoil({ x: 1, y: 0 }, PISTOL_WEAPON.recoil, 2);
    const rifle = applyWeaponRecoil({ x: 1, y: 0 }, BURST_RIFLE_WEAPON.recoil, 2);

    expect(Math.abs(Math.atan2(rifle.y, rifle.x))).toBeGreaterThan(
      Math.abs(Math.atan2(pistol.y, pistol.x)),
    );
  });
});