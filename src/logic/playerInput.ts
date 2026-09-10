import { resolveAimDirection } from './aim';
import type { Vector2 } from './hitscan';
import type { MovementInput } from './movement';

export interface PlayerInputSnapshot {
  movement: MovementInput;
  manualAimDirection: Vector2;
  pendingFireRequests: number[];
  reloadRequested: boolean;
  shoveRequested: boolean;
}

export function createPlayerInputState(
  aimDirection: Vector2 = { x: 1, y: 0 },
): PlayerInputSnapshot {
  return {
    movement: { x: 0, y: 0 },
    manualAimDirection: resolveAimDirection(aimDirection, { x: 1, y: 0 }),
    pendingFireRequests: [],
    reloadRequested: false,
    shoveRequested: false,
  };
}

export function withMovement(
  state: PlayerInputSnapshot,
  movement: MovementInput,
): PlayerInputSnapshot {
  return { ...state, movement: { ...movement } };
}

export function withAimCandidate(
  state: PlayerInputSnapshot,
  candidate: Vector2,
): PlayerInputSnapshot {
  return {
    ...state,
    manualAimDirection: resolveAimDirection(candidate, state.manualAimDirection),
  };
}

export function requestFire(
  state: PlayerInputSnapshot,
  requestedAtSimulationMs = 0,
): PlayerInputSnapshot {
  const requestedAtMs = Number.isFinite(requestedAtSimulationMs)
    ? Math.max(0, requestedAtSimulationMs)
    : 0;
  return {
    ...state,
    pendingFireRequests: [...state.pendingFireRequests, requestedAtMs],
  };
}

export function requestReload(state: PlayerInputSnapshot): PlayerInputSnapshot {
  return { ...state, reloadRequested: true };
}

export function requestShove(state: PlayerInputSnapshot): PlayerInputSnapshot {
  return { ...state, shoveRequested: true };
}

export function consumeFireRequest(
  state: PlayerInputSnapshot,
  throughSimulationMs = Number.POSITIVE_INFINITY,
): { requested: boolean; requestedAtSimulationMs: number | null; state: PlayerInputSnapshot } {
  const requestedAtSimulationMs = state.pendingFireRequests[0];
  const requested = requestedAtSimulationMs !== undefined
    && requestedAtSimulationMs <= throughSimulationMs;
  return {
    requested,
    requestedAtSimulationMs: requested ? requestedAtSimulationMs : null,
    state: requested
      ? { ...state, pendingFireRequests: state.pendingFireRequests.slice(1) }
      : state,
  };
}

export function consumeReloadRequest(
  state: PlayerInputSnapshot,
): { requested: boolean; state: PlayerInputSnapshot } {
  return {
    requested: state.reloadRequested,
    state: state.reloadRequested ? { ...state, reloadRequested: false } : state,
  };
}

export function consumeShoveRequest(
  state: PlayerInputSnapshot,
): { requested: boolean; state: PlayerInputSnapshot } {
  return {
    requested: state.shoveRequested,
    state: state.shoveRequested ? { ...state, shoveRequested: false } : state,
  };
}

export function clearActiveInput(state: PlayerInputSnapshot): PlayerInputSnapshot {
  return {
    ...state,
    movement: { x: 0, y: 0 },
    pendingFireRequests: [],
    reloadRequested: false,
    shoveRequested: false,
  };
}
