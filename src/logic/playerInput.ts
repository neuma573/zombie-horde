import { resolveAimDirection } from './aim';
import type { Vector2 } from './hitscan';
import type { MovementInput } from './movement';

export interface PlayerInputSnapshot {
  movement: MovementInput;
  manualAimDirection: Vector2;
  pendingFireCount: number;
  reloadRequested: boolean;
}

export function createPlayerInputState(
  aimDirection: Vector2 = { x: 1, y: 0 },
): PlayerInputSnapshot {
  return {
    movement: { x: 0, y: 0 },
    manualAimDirection: resolveAimDirection(aimDirection, { x: 1, y: 0 }),
    pendingFireCount: 0,
    reloadRequested: false,
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

export function requestFire(state: PlayerInputSnapshot): PlayerInputSnapshot {
  return { ...state, pendingFireCount: state.pendingFireCount + 1 };
}

export function requestReload(state: PlayerInputSnapshot): PlayerInputSnapshot {
  return { ...state, reloadRequested: true };
}

export function consumeFireRequest(
  state: PlayerInputSnapshot,
): { requested: boolean; state: PlayerInputSnapshot } {
  return {
    requested: state.pendingFireCount > 0,
    state: state.pendingFireCount > 0
      ? { ...state, pendingFireCount: state.pendingFireCount - 1 }
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

export function clearActiveInput(state: PlayerInputSnapshot): PlayerInputSnapshot {
  return {
    ...state,
    movement: { x: 0, y: 0 },
    pendingFireCount: 0,
    reloadRequested: false,
  };
}
