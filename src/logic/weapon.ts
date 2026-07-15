export interface WeaponConfig {
  damage: number;
  range: number;
  fireIntervalMs: number;
  magazineSize: number;
  reserveAmmo: number;
  reloadDurationMs: number;
  maxTargets: number;
}

export interface WeaponState {
  magazineAmmo: number;
  reserveAmmo: number;
  cooldownRemainingMs: number;
  reloadRemainingMs: number | null;
}

export interface FireResult {
  fired: boolean;
  state: WeaponState;
}

export function createWeaponState(config: WeaponConfig): WeaponState {
  return {
    magazineAmmo: config.magazineSize,
    reserveAmmo: config.reserveAmmo,
    cooldownRemainingMs: 0,
    reloadRemainingMs: null,
  };
}

export function advanceWeapon(
  state: WeaponState,
  config: WeaponConfig,
  deltaMs: number,
): WeaponState {
  const elapsedMs = Math.max(0, deltaMs);
  const cooldownRemainingMs = Math.max(0, state.cooldownRemainingMs - elapsedMs);

  if (state.reloadRemainingMs === null) {
    return { ...state, cooldownRemainingMs };
  }

  const reloadRemainingMs = state.reloadRemainingMs - elapsedMs;

  if (reloadRemainingMs > 0) {
    return { ...state, cooldownRemainingMs, reloadRemainingMs };
  }

  const ammoNeeded = config.magazineSize - state.magazineAmmo;
  const ammoToLoad = Math.min(ammoNeeded, state.reserveAmmo);

  return {
    magazineAmmo: state.magazineAmmo + ammoToLoad,
    reserveAmmo: state.reserveAmmo - ammoToLoad,
    cooldownRemainingMs,
    reloadRemainingMs: null,
  };
}

export function tryFire(state: WeaponState, config: WeaponConfig): FireResult {
  const canFire = state.reloadRemainingMs === null
    && state.cooldownRemainingMs <= 0
    && state.magazineAmmo > 0;

  if (!canFire) {
    return { fired: false, state };
  }

  return {
    fired: true,
    state: {
      ...state,
      magazineAmmo: state.magazineAmmo - 1,
      cooldownRemainingMs: config.fireIntervalMs,
    },
  };
}

export function startReload(state: WeaponState, config: WeaponConfig): WeaponState {
  const canReload = state.reloadRemainingMs === null
    && state.magazineAmmo < config.magazineSize
    && state.reserveAmmo > 0;

  return canReload
    ? { ...state, reloadRemainingMs: config.reloadDurationMs }
    : state;
}
