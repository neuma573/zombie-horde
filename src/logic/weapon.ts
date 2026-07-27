export interface WeaponConfig {
  damage: number;
  range: number;
  fireIntervalMs: number;
  magazineSize: number;
  reserveAmmo: number;
  reloadDurationMs: number;
  maxTargets: number;
  burstSize?: number;
  burstIntervalMs?: number;
}

export type WeaponId = 'pistol' | 'burstRifle';
export const WEAPON_RARITIES = [
  'common',
  'uncommon',
  'rare',
  'epic',
  'legendary',
] as const;
export type WeaponRarity = typeof WEAPON_RARITIES[number];
export type AmmoType = 'pistolAmmo' | 'rifleAmmo';

export interface WeaponDefinition {
  id: WeaponId;
  name: string;
  description: string;
  rarity: WeaponRarity;
  recoil: number;
  accuracy: {
    baseSpreadDegrees: number;
    consecutiveSpreadGrowthDegrees: number;
    maxSpreadDegrees: number;
  };
  ammoType: AmmoType;
  config: WeaponConfig;
}

export function withWeaponRarity(
  definition: WeaponDefinition,
  rarity: WeaponRarity,
): WeaponDefinition {
  return { ...definition, rarity };
}

export interface OwnedWeapon {
  definition: WeaponDefinition;
  state: WeaponState;
}

export interface WeaponInventoryState {
  slots: [OwnedWeapon | null, OwnedWeapon | null];
  activeSlot: 0 | 1;
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

export interface PickupResult {
  state: WeaponInventoryState;
  accepted: boolean;
  replaced: OwnedWeapon | null;
}

export interface FirstShotAccuracyState {
  elapsedSinceShotMs: number;
  consecutiveShots: number;
}

export const FIRST_SHOT_ACCURACY = {
  resetDelayMs: 500,
  recoilMultiplier: 0.15,
} as const;

export function createFirstShotAccuracyState(): FirstShotAccuracyState {
  return {
    elapsedSinceShotMs: Number.POSITIVE_INFINITY,
    consecutiveShots: 0,
  };
}

export function advanceFirstShotAccuracy(
  state: FirstShotAccuracyState,
  deltaMs: number,
): FirstShotAccuracyState {
  const elapsedSinceShotMs = state.elapsedSinceShotMs === Number.POSITIVE_INFINITY
    ? Number.POSITIVE_INFINITY
    : state.elapsedSinceShotMs + Math.max(0, deltaMs);
  return {
    elapsedSinceShotMs,
    consecutiveShots: elapsedSinceShotMs >= FIRST_SHOT_ACCURACY.resetDelayMs
      ? 0
      : state.consecutiveShots,
  };
}

export function consumeFirstShotAccuracy(
  state: FirstShotAccuracyState,
  resetDelayMs = FIRST_SHOT_ACCURACY.resetDelayMs,
): {
  isAccurateFirstShot: boolean;
  consecutiveShotIndex: number;
  state: FirstShotAccuracyState;
} {
  const isAccurateFirstShot = state.elapsedSinceShotMs >= Math.max(0, resetDelayMs);
  const consecutiveShotIndex = isAccurateFirstShot ? 0 : state.consecutiveShots;
  return {
    isAccurateFirstShot,
    consecutiveShotIndex,
    state: {
      elapsedSinceShotMs: 0,
      consecutiveShots: consecutiveShotIndex + 1,
    },
  };
}

export function weaponSpreadDegrees(
  definition: WeaponDefinition,
  consecutiveShotIndex: number,
  isAccurateFirstShot: boolean,
): number {
  const accuracy = definition.accuracy;
  const spread = Math.min(
    accuracy.maxSpreadDegrees,
    accuracy.baseSpreadDegrees
      + Math.max(0, consecutiveShotIndex) * accuracy.consecutiveSpreadGrowthDegrees,
  );
  return isAccurateFirstShot
    ? spread * FIRST_SHOT_ACCURACY.recoilMultiplier
    : spread;
}

export interface ReloadProgress {
  isReloading: boolean;
  elapsedMs: number;
  durationMs: number;
  normalized: number;
}

export function createWeaponState(config: WeaponConfig): WeaponState {
  return {
    magazineAmmo: config.magazineSize,
    reserveAmmo: config.reserveAmmo,
    cooldownRemainingMs: 0,
    reloadRemainingMs: null,
  };
}

export function createWeaponInventory(
  startingWeapon: WeaponDefinition,
): WeaponInventoryState {
  return {
    slots: [{
      definition: startingWeapon,
      state: createWeaponState(startingWeapon.config),
    }, null],
    activeSlot: 0,
  };
}

export function createOwnedWeapon(
  definition: WeaponDefinition,
): OwnedWeapon {
  return {
    definition,
    state: createWeaponState(definition.config),
  };
}

export function selectWeaponSlot(
  state: WeaponInventoryState,
  slot: 0 | 1,
): WeaponInventoryState {
  return state.slots[slot] === null || slot === state.activeSlot
    ? state
    : { ...state, activeSlot: slot };
}

export function shouldAutoPickupWeapon(
  state: WeaponInventoryState,
  isInPickupRange: boolean,
): boolean {
  return isInPickupRange && state.slots.some((slot) => slot === null);
}

export function shouldShowFieldWeaponInfo(
  hasTwoWeapons: boolean,
  mobileControlsEnabled: boolean,
  isInPickupRange: boolean,
  isHovered: boolean,
): boolean {
  if (!hasTwoWeapons) return false;
  return mobileControlsEnabled ? isInPickupRange : isHovered;
}

export function applyWeaponRecoil(
  direction: { x: number; y: number },
  recoilDegrees: number,
  shotSequence: number,
  recoilSeed = 0,
): { x: number; y: number } {
  const length = Math.hypot(direction.x, direction.y);
  if (length <= 1e-8) return { x: 1, y: 0 };

  const normalized = { x: direction.x / length, y: direction.y / length };
  const recoil = Number.isFinite(recoilDegrees) ? Math.max(0, recoilDegrees) : 0;
  const random = recoilRandom(shotSequence, recoilSeed);
  const angle = recoil * (random * 2 - 1) * Math.PI / 180;
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);

  return {
    x: normalized.x * cos - normalized.y * sin,
    y: normalized.x * sin + normalized.y * cos,
  };
}

export function advanceWeaponPickupLifetime(
  remainingMs: number,
  deltaMs: number,
): number {
  return Math.max(0, Math.max(0, remainingMs) - Math.max(0, deltaMs));
}

function recoilRandom(shotSequence: number, recoilSeed: number): number {
  let value = (Math.trunc(shotSequence) + 1) ^ Math.trunc(recoilSeed);
  value = Math.imul(value ^ (value >>> 16), 0x21f0aaad);
  value = Math.imul(value ^ (value >>> 15), 0x735a2d97);
  value ^= value >>> 15;
  return (value >>> 0) / 0x1_0000_0000;
}

export function pickupWeapon(
  state: WeaponInventoryState,
  definition: WeaponDefinition,
): PickupResult {
  const emptySlot = state.slots.findIndex((slot) => slot === null);
  const ownedWeapon: OwnedWeapon = {
    definition,
    state: createWeaponState(definition.config),
  };

  if (emptySlot >= 0) {
    const slots: WeaponInventoryState['slots'] = [...state.slots];
    slots[emptySlot] = ownedWeapon;
    return {
      state: { slots, activeSlot: emptySlot as 0 | 1 },
      accepted: true,
      replaced: null,
    };
  }

  const replaced = state.slots[state.activeSlot];
  const slots: WeaponInventoryState['slots'] = [...state.slots];
  slots[state.activeSlot] = ownedWeapon;
  return {
    state: { ...state, slots },
    accepted: true,
    replaced,
  };
}

export function pickupOwnedWeapon(
  state: WeaponInventoryState,
  ownedWeapon: OwnedWeapon,
): PickupResult {
  const emptySlot = state.slots.findIndex((slot) => slot === null);

  if (emptySlot >= 0) {
    const slots: WeaponInventoryState['slots'] = [...state.slots];
    slots[emptySlot] = ownedWeapon;
    return {
      state: { slots, activeSlot: emptySlot as 0 | 1 },
      accepted: true,
      replaced: null,
    };
  }

  const replaced = state.slots[state.activeSlot];
  const slots: WeaponInventoryState['slots'] = [...state.slots];
  slots[state.activeSlot] = ownedWeapon;
  return {
    state: { ...state, slots },
    accepted: true,
    replaced,
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

export function shouldAutoReload(
  state: WeaponState,
  mobileControlsEnabled: boolean,
): boolean {
  return mobileControlsEnabled
    && state.magazineAmmo === 0
    && state.reserveAmmo > 0
    && state.reloadRemainingMs === null;
}

export function getReloadProgress(
  state: WeaponState,
  config: WeaponConfig,
): ReloadProgress {
  if (state.reloadRemainingMs === null) {
    return { isReloading: false, elapsedMs: 0, durationMs: 0, normalized: 0 };
  }

  const durationMs = Number.isFinite(config.reloadDurationMs)
    ? Math.max(0, config.reloadDurationMs)
    : 0;

  if (durationMs === 0) {
    return { isReloading: true, elapsedMs: 0, durationMs: 0, normalized: 1 };
  }

  const remainingMs = Number.isFinite(state.reloadRemainingMs)
    ? Math.min(durationMs, Math.max(0, state.reloadRemainingMs))
    : durationMs;
  const elapsedMs = durationMs - remainingMs;

  return {
    isReloading: true,
    elapsedMs,
    durationMs,
    normalized: Math.min(1, Math.max(0, elapsedMs / durationMs)),
  };
}
