import { describe, expect, it } from 'vitest';

import {
  advanceWeapon,
  advanceWeaponPickupLifetime,
  advanceFirstShotAccuracy,
  applyWeaponRecoil,
  createOwnedWeapon,
  createFirstShotAccuracyState,
  createWeaponInventory,
  createWeaponState,
  getReloadProgress,
  hasLoadedWeaponPickup,
  consumeFirstShotAccuracy,
  FIRST_SHOT_ACCURACY,
  pickupWeapon,
  selectWeaponSlot,
  shouldAutoPickupWeapon,
  shouldAutoReload,
  shouldShowFieldWeaponInfo,
  startReload,
  tryFire,
  WEAPON_RARITIES,
  withWeaponRarity,
  weaponSpreadDegrees,
  type WeaponConfig,
} from '../logic/weapon';
import {
  BURST_RIFLE_WEAPON,
  PISTOL_WEAPON,
  STARTING_AMMO_RESERVES,
} from '../config/weaponConfig';
import { ZOMBIE_CONFIG } from '../config/zombieConfig';
import { applyDamage } from '../logic/damage';
import { WeaponSystem } from '../systems/WeaponSystem';

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
  it('starts the service pistol with 17 loaded rounds and 100 reserve rounds', () => {
    const system = new WeaponSystem(PISTOL_WEAPON, STARTING_AMMO_RESERVES);

    expect(system.getState()).toMatchObject({
      magazineAmmo: 17,
      reserveAmmo: 100,
    });
    expect(system.getAmmoReserves().pistolAmmo).toBe(100);
    expect(system.getAmmoReserves().rifleAmmo).toBe(0);
  });

  it('requires four pistol body shots to kill the base zombie', () => {
    let health: number = ZOMBIE_CONFIG.health;

    for (let shot = 0; shot < 3; shot += 1) {
      const result = applyDamage(health, PISTOL_WEAPON.config.damage);
      health = result.health;
      expect(result.died).toBe(false);
    }

    const fourthShot = applyDamage(health, PISTOL_WEAPON.config.damage);
    expect(health).toBe(13);
    expect(fourthShot).toEqual({ health: 0, died: true });
  });

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

  it('starts with a pistol and adds a pickup to the empty second slot', () => {
    const initial = createWeaponInventory(PISTOL_WEAPON);
    const pickup = pickupWeapon(initial, BURST_RIFLE_WEAPON);

    expect(initial.slots[0]?.definition.id).toBe('pistol');
    expect(initial.slots[1]).toBeNull();
    expect(pickup.state.slots.map((slot) => slot?.definition.id)).toEqual([
      'pistol',
      'burstRifle',
    ]);
    expect(pickup.state.activeSlot).toBe(1);
    expect(pickup.replaced).toBeNull();
  });

  it('stacks reserve ammunition without a maximum holding limit', () => {
    const system = new WeaponSystem(PISTOL_WEAPON, { pistolAmmo: 90 });

    expect(system.addReserveAmmo('pistolAmmo', 68)).toBe(68);
    expect(system.getAmmoReserves().pistolAmmo).toBe(158);
    expect(system.getState().reserveAmmo).toBe(158);
  });

  it('replaces only the active weapon when both slots are occupied', () => {
    const full = pickupWeapon(
      createWeaponInventory(PISTOL_WEAPON),
      BURST_RIFLE_WEAPON,
    ).state;
    const selectedPistol = selectWeaponSlot(full, 0);
    const replacement = pickupWeapon(selectedPistol, BURST_RIFLE_WEAPON);

    expect(replacement.replaced?.definition.id).toBe('pistol');
    expect(replacement.state.slots.map((slot) => slot?.definition.id)).toEqual([
      'burstRifle',
      'burstRifle',
    ]);
  });

  it('automatically picks up on contact only while a weapon slot is empty', () => {
    const initial = createWeaponInventory(PISTOL_WEAPON);
    const full = pickupWeapon(initial, BURST_RIFLE_WEAPON).state;

    expect(shouldAutoPickupWeapon(initial, true)).toBe(true);
    expect(shouldAutoPickupWeapon(initial, false)).toBe(false);
    expect(shouldAutoPickupWeapon(full, true)).toBe(false);
  });

  it('treats only loaded ground weapons as immediate ammunition recovery', () => {
    const loaded = createOwnedWeapon(BURST_RIFLE_WEAPON);
    const empty = {
      ...loaded,
      state: { ...loaded.state, magazineAmmo: 0 },
    };

    expect(hasLoadedWeaponPickup([loaded])).toBe(true);
    expect(hasLoadedWeaponPickup([empty])).toBe(false);
    expect(hasLoadedWeaponPickup([])).toBe(false);
  });

  it('shows field weapon info only with two weapons and the correct input trigger', () => {
    expect(shouldShowFieldWeaponInfo(false, false, true, true)).toBe(false);
    expect(shouldShowFieldWeaponInfo(false, true, true, false)).toBe(false);
    expect(shouldShowFieldWeaponInfo(true, false, false, true)).toBe(true);
    expect(shouldShowFieldWeaponInfo(true, false, true, false)).toBe(false);
    expect(shouldShowFieldWeaponInfo(true, true, true, false)).toBe(true);
    expect(shouldShowFieldWeaponInfo(true, true, false, true)).toBe(false);
  });

  it('uses the increased pistol fire rate', () => {
    expect(PISTOL_WEAPON.config.fireIntervalMs).toBe(150);
  });

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

  it('supports every rarity independently for each weapon type', () => {
    for (const rarity of WEAPON_RARITIES) {
      expect(withWeaponRarity(PISTOL_WEAPON, rarity)).toMatchObject({
        id: 'pistol',
        rarity,
      });
      expect(withWeaponRarity(BURST_RIFLE_WEAPON, rarity)).toMatchObject({
        id: 'burstRifle',
        rarity,
      });
    }
  });

  it('cancels a reload when switching weapons', () => {
    const system = new WeaponSystem(PISTOL_WEAPON);
    system.fire();
    system.reload();
    system.pickup(BURST_RIFLE_WEAPON);
    system.update(1_000);
    system.selectSlot(0);

    expect(system.getState().reloadRemainingMs).toBeNull();
    expect(system.getState().magazineAmmo).toBe(
      PISTOL_WEAPON.config.magazineSize - 1,
    );
  });

  it('does not cancel reload when selecting the already active slot', () => {
    const system = new WeaponSystem(PISTOL_WEAPON);
    system.fire();
    system.reload();
    const reloadRemainingMs = system.getState().reloadRemainingMs;

    system.selectSlot(0);

    expect(system.getState().reloadRemainingMs).toBe(reloadRemainingMs);
  });

  it('does not create reserve ammo when a dropped weapon is picked up', () => {
    const system = new WeaponSystem(PISTOL_WEAPON, {
      pistolAmmo: 0,
      rifleAmmo: 0,
    });
    const fieldRifle = createOwnedWeapon(BURST_RIFLE_WEAPON);

    system.pickupOwned(fieldRifle);

    expect(system.getState().magazineAmmo).toBe(
      BURST_RIFLE_WEAPON.config.magazineSize,
    );
    expect(system.getState().reserveAmmo).toBe(0);
    expect(system.getAmmoReserves()).toEqual({
      pistolAmmo: 0,
      rifleAmmo: 0,
    });
  });

  it('preserves magazine ammo across dropping and picking up a weapon', () => {
    const system = new WeaponSystem(PISTOL_WEAPON);
    system.fire();
    system.pickup(BURST_RIFLE_WEAPON);
    system.selectSlot(0);
    const droppedPistol = system.pickup(BURST_RIFLE_WEAPON);

    expect(droppedPistol?.state.magazineAmmo).toBe(
      PISTOL_WEAPON.config.magazineSize - 1,
    );

    system.pickupOwned(droppedPistol!);
    expect(system.getState().magazineAmmo).toBe(
      PISTOL_WEAPON.config.magazineSize - 1,
    );
  });

  it('uses doubled ranges and a faster, harder-kicking rifle burst', () => {
    expect(PISTOL_WEAPON.config.range).toBe(1_200);
    expect(BURST_RIFLE_WEAPON.config.range).toBe(1_520);
    expect(BURST_RIFLE_WEAPON.config.fireIntervalMs).toBe(220);
    expect(BURST_RIFLE_WEAPON.config.burstIntervalMs).toBe(65);
    expect(BURST_RIFLE_WEAPON.recoil).toBeGreaterThan(PISTOL_WEAPON.recoil);
  });

  it('expires a field weapon after thirty seconds of simulation time', () => {
    const halfway = advanceWeaponPickupLifetime(30_000, 15_000);

    expect(halfway).toBe(15_000);
    expect(advanceWeaponPickupLifetime(halfway, 14_999)).toBe(1);
    expect(advanceWeaponPickupLifetime(1, 1)).toBe(0);
  });

  it('emits the remaining rifle burst rounds from elapsed simulation time', () => {
    const system = new WeaponSystem(PISTOL_WEAPON);
    system.pickup(BURST_RIFLE_WEAPON);

    expect(system.fire()).toBe(true);
    expect(system.getState().magazineAmmo).toBe(29);
    expect(system.update(64)).toBe(0);
    expect(system.update(1)).toBe(1);
    expect(system.update(65)).toBe(1);
    expect(system.getState().magazineAmmo).toBe(27);
    expect(system.update(1_000)).toBe(0);
  });

  it('advances cooldown after overdue burst rounds independently of delta chunking', () => {
    const singleUpdate = new WeaponSystem(BURST_RIFLE_WEAPON);
    const splitUpdates = new WeaponSystem(BURST_RIFLE_WEAPON);

    expect(singleUpdate.fire()).toBe(true);
    expect(splitUpdates.fire()).toBe(true);

    expect(singleUpdate.update(1_000)).toBe(2);
    expect(splitUpdates.update(65)).toBe(1);
    expect(splitUpdates.update(65)).toBe(1);
    expect(splitUpdates.update(870)).toBe(0);

    expect(singleUpdate.getState()).toEqual(splitUpdates.getState());
    expect(singleUpdate.getState()).toMatchObject({
      magazineAmmo: 27,
      cooldownRemainingMs: 0,
    });
  });
});
