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

  it('uses cooldown without consuming ammunition for a melee attack', () => {
    const melee = { ...config, magazineSize: 0, reserveAmmo: 0, usesAmmo: false };
    const initial = createWeaponState(melee);
    const firstAttack = tryFire(initial, melee);

    expect(firstAttack.fired).toBe(true);
    expect(firstAttack.state.magazineAmmo).toBe(0);
    expect(tryFire(firstAttack.state, melee).fired).toBe(false);
    expect(tryFire(
      advanceWeapon(firstAttack.state, melee, melee.fireIntervalMs),
      melee,
    ).fired).toBe(true);
  });

  it('retains fired casings only for break-action weapons', () => {
    const breakAction = {
      ...config,
      retainsSpentCasings: true,
      casingExtractionProgress: 0.58,
    };

    const first = tryFire(createWeaponState(breakAction), breakAction);
    const second = tryFire(
      advanceWeapon(first.state, breakAction, breakAction.fireIntervalMs),
      breakAction,
    );

    expect(first.state.spentCasings).toBe(1);
    expect(second.state.spentCasings).toBe(2);
    expect(tryFire(createWeaponState(config), config).state.spentCasings).toBe(0);
  });
});
