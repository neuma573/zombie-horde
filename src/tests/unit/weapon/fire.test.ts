import { describe, expect, it } from 'vitest';

import { advanceWeapon, createWeaponState, tryFire, type WeaponConfig } from '../../../logic/weapon';

const config: WeaponConfig = {
  damage: 25,
  range: 600,
  fireIntervalMs: 200,
  magazineSize: 3,
  reserveAmmo: 5,
  reloadDurationMs: 1_000,
  maxTargets: 1,
};

describe('weapon fire', () => {
  it('consumes ammo only when a shot succeeds', () => {
    const initial = createWeaponState(config);
    const firstShot = tryFire(initial, config);
    const blockedShot = tryFire(firstShot.state, config);

    expect(firstShot.fired).toBe(true);
    expect(firstShot.state.magazineAmmo).toBe(2);
    expect(blockedShot.fired).toBe(false);
    expect(blockedShot.state.magazineAmmo).toBe(2);
  });

  it('allows another shot after the frame-independent fire interval', () => {
    const firstShot = tryFire(createWeaponState(config), config);
    const partial = advanceWeapon(firstShot.state, config, 50);
    const ready = advanceWeapon(partial, config, 150);

    expect(tryFire(partial, config).fired).toBe(false);
    expect(tryFire(ready, config).fired).toBe(true);
  });

  it('does not fire with an empty magazine', () => {
    const empty = { ...createWeaponState(config), magazineAmmo: 0 };

    expect(tryFire(empty, config)).toEqual({ fired: false, state: empty });
  });
});