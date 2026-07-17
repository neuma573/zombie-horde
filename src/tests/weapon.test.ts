import { describe, expect, it } from 'vitest';

import {
  advanceWeapon,
  createWeaponState,
  getReloadProgress,
  shouldAutoReload,
  startReload,
  tryFire,
  type WeaponConfig,
} from '../logic/weapon';

const config: WeaponConfig = {
  damage: 25,
  range: 600,
  fireIntervalMs: 200,
  magazineSize: 3,
  reserveAmmo: 5,
  reloadDurationMs: 1_000,
  maxTargets: 1,
};

describe('weapon logic', () => {
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

  it('blocks firing until reloading completes', () => {
    const spent = { ...createWeaponState(config), magazineAmmo: 1 };
    const reloading = startReload(spent, config);
    const almostDone = advanceWeapon(reloading, config, 999);
    const loaded = advanceWeapon(almostDone, config, 1);

    expect(tryFire(reloading, config).fired).toBe(false);
    expect(tryFire(almostDone, config).fired).toBe(false);
    expect(loaded).toMatchObject({
      magazineAmmo: 3,
      reserveAmmo: 3,
      reloadRemainingMs: null,
    });
  });

  it('loads only the available reserve ammo', () => {
    const lowReserve = {
      ...createWeaponState(config),
      magazineAmmo: 0,
      reserveAmmo: 2,
    };
    const loaded = advanceWeapon(startReload(lowReserve, config), config, 1_000);

    expect(loaded.magazineAmmo).toBe(2);
    expect(loaded.reserveAmmo).toBe(0);
  });

  it('does not start an unnecessary reload', () => {
    const full = createWeaponState(config);
    const noReserve = { ...full, magazineAmmo: 1, reserveAmmo: 0 };

    expect(startReload(full, config)).toBe(full);
    expect(startReload(noReserve, config)).toBe(noReserve);
  });

  it('derives clamped reload progress from weapon state', () => {
    const reloading = startReload({ ...createWeaponState(config), magazineAmmo: 1 }, config);
    const halfway = advanceWeapon(reloading, config, 500);

    expect(getReloadProgress(reloading, config)).toMatchObject({
      isReloading: true,
      elapsedMs: 0,
      durationMs: 1_000,
      normalized: 0,
    });
    expect(getReloadProgress(halfway, config).normalized).toBe(0.5);
    expect(getReloadProgress(advanceWeapon(halfway, config, 500), config)).toEqual({
      isReloading: false,
      elapsedMs: 0,
      durationMs: 0,
      normalized: 0,
    });
  });

  it('never returns a non-finite reload progress for an invalid duration', () => {
    const invalidConfig = { ...config, reloadDurationMs: 0 };
    const state = { ...createWeaponState(invalidConfig), magazineAmmo: 0, reloadRemainingMs: 0 };

    expect(getReloadProgress(state, invalidConfig).normalized).toBe(1);
  });

  it('requests automatic reload only for an empty mobile weapon with reserve ammo', () => {
    const empty = { ...createWeaponState(config), magazineAmmo: 0 };

    expect(shouldAutoReload(empty, true)).toBe(true);
    expect(shouldAutoReload(empty, false)).toBe(false);
    expect(shouldAutoReload({ ...empty, magazineAmmo: 1 }, true)).toBe(false);
    expect(shouldAutoReload({ ...empty, reserveAmmo: 0 }, true)).toBe(false);
    expect(shouldAutoReload({ ...empty, reloadRemainingMs: 500 }, true)).toBe(false);
  });

  it('starts reload only after the last shot has consumed its ammo', () => {
    const lastRound = { ...createWeaponState(config), magazineAmmo: 1 };

    expect(shouldAutoReload(lastRound, true)).toBe(false);

    const shot = tryFire(lastRound, config);
    expect(shot.fired).toBe(true);
    expect(shouldAutoReload(shot.state, true)).toBe(true);
    expect(startReload(shot.state, config).reloadRemainingMs).toBe(config.reloadDurationMs);
  });
});
