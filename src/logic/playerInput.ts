import { resolveAimDirection } from './aim';
import type { Vector2 } from './hitscan';
import type { MovementInput } from './movement';

export interface PlayerInputSnapshot {
  movement: MovementInput;
  manualAimDirection: Vector2;
}

export function createPlayerInputState(
  aimDirection: Vector2 = { x: 1, y: 0 },
): PlayerInputSnapshot {
  return {
    movement: { x: 0, y: 0 },
    manualAimDirection: resolveAimDirection(aimDirection, { x: 1, y: 0 }),
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

export function clearActiveInput(state: PlayerInputSnapshot): PlayerInputSnapshot {
  return {
    ...state,
    movement: { x: 0, y: 0 },
  };
}
