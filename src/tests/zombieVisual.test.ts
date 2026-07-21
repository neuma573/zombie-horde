import { describe, expect, it } from 'vitest';

import { resolveZombieAttackPose } from '../logic/zombieVisual';

describe('zombie attack visual pose', () => {
  it('pulls the striking hand back before swinging through the target', () => {
    const idle = resolveZombieAttackPose(null, 0, 260, 540);
    const woundUp = resolveZombieAttackPose(117, 0, 260, 540);
    const impact = resolveZombieAttackPose(null, 540, 260, 540);

    expect(woundUp.upperHandX).toBeLessThan(idle.upperHandX);
    expect(woundUp.upperHandY).toBeLessThan(idle.upperHandY);
    expect(impact.upperHandX).toBeGreaterThan(idle.upperHandX);
    expect(impact.upperHandY).toBeGreaterThan(idle.upperHandY);
  });

  it('returns to idle after the impact recovery window', () => {
    const idle = resolveZombieAttackPose(null, 0, 260, 540);
    const recovered = resolveZombieAttackPose(null, 360, 260, 540);

    expect(recovered).toEqual(idle);
  });
});
