import { describe, expect, it } from 'vitest';

import {
  applyWeaponRecoil,
  weaponSpreadDegrees,
  type WeaponDefinition,
} from '../../logic/weapon';
import {
  BURST_RIFLE_WEAPON,
  PISTOL_WEAPON,
} from '../../config/weaponConfig';

const SAMPLE_COUNT = 10_000;
const SMALL_TARGET_HALF_ANGLE_DEGREES = 0.1;

interface AccuracySample {
  meanErrorDegrees: number;
  hitRate: number;
}

function sampleAccuracy(
  definition: WeaponDefinition,
  consecutiveShotIndex: number,
  firstShot: boolean,
): AccuracySample {
  const spreadDegrees = weaponSpreadDegrees(
    definition,
    consecutiveShotIndex,
    firstShot,
  );
  let totalErrorDegrees = 0;
  let hitCount = 0;

  for (let seed = 0; seed < SAMPLE_COUNT; seed += 1) {
    const direction = applyWeaponRecoil(
      { x: 1, y: 0 },
      spreadDegrees,
      0,
      seed,
    );
    const errorDegrees = Math.abs(
      Math.atan2(direction.y, direction.x) * 180 / Math.PI,
    );
    totalErrorDegrees += errorDegrees;
    if (errorDegrees <= SMALL_TARGET_HALF_ANGLE_DEGREES) hitCount += 1;
  }

  return {
    meanErrorDegrees: totalErrorDegrees / SAMPLE_COUNT,
    hitRate: hitCount / SAMPLE_COUNT,
  };
}

describe('weapon accuracy proof', () => {
  it('proves the rifle first shot is more accurate across deterministic recoil seeds', () => {
    const pistol = sampleAccuracy(PISTOL_WEAPON, 0, true);
    const rifle = sampleAccuracy(BURST_RIFLE_WEAPON, 0, true);

    expect(rifle.meanErrorDegrees).toBeLessThan(pistol.meanErrorDegrees);
    expect(rifle.hitRate).toBeGreaterThan(pistol.hitRate);
  });

  it('proves sustained rifle fire eventually becomes harder to control', () => {
    const pistol = sampleAccuracy(PISTOL_WEAPON, 5, false);
    const rifle = sampleAccuracy(BURST_RIFLE_WEAPON, 5, false);

    expect(rifle.meanErrorDegrees).toBeGreaterThan(pistol.meanErrorDegrees);
    expect(rifle.hitRate).toBeLessThan(pistol.hitRate);
  });
});
