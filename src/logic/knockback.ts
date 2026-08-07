import type { Vector2 } from './hitscan';

export interface KnockbackState {
  direction: Vector2;
  distance: number;
  durationMs: number;
  elapsedMs: number;
}

export interface KnockbackStep {
  state: KnockbackState | null;
  displacement: Vector2;
}

function easeOutCubic(progress: number): number {
  return 1 - (1 - progress) ** 3;
}

export function remainingKnockbackDisplacement(state: KnockbackState): Vector2 {
  const progress = Math.min(1, Math.max(0, state.elapsedMs / state.durationMs));
  const remainingDistance = state.distance * (1 - easeOutCubic(progress));
  return {
    x: state.direction.x * remainingDistance,
    y: state.direction.y * remainingDistance,
  };
}

export function combineKnockbacks(
  current: KnockbackState | undefined,
  added: KnockbackState,
): KnockbackState {
  if (!current) return added;

  const remaining = remainingKnockbackDisplacement(current);
  const combined = {
    x: remaining.x + added.direction.x * added.distance,
    y: remaining.y + added.direction.y * added.distance,
  };
  return createKnockbackState(combined, Math.hypot(combined.x, combined.y), added.durationMs)
    ?? added;
}

export function createKnockbackState(
  direction: Vector2,
  distance: number,
  durationMs: number,
): KnockbackState | null {
  const length = Math.hypot(direction.x, direction.y);
  if (length <= 0 || distance <= 0 || durationMs <= 0) return null;

  return {
    direction: { x: direction.x / length, y: direction.y / length },
    distance,
    durationMs,
    elapsedMs: 0,
  };
}

export function advanceKnockback(
  state: KnockbackState,
  deltaMs: number,
): KnockbackStep {
  if (!Number.isFinite(deltaMs) || deltaMs <= 0) {
    return { state, displacement: { x: 0, y: 0 } };
  }

  const nextElapsed = Math.min(state.durationMs, state.elapsedMs + deltaMs);
  const previousProgress = state.elapsedMs / state.durationMs;
  const nextProgress = nextElapsed / state.durationMs;
  const distance = state.distance
    * (easeOutCubic(nextProgress) - easeOutCubic(previousProgress));

  return {
    state: nextElapsed >= state.durationMs
      ? null
      : { ...state, elapsedMs: nextElapsed },
    displacement: {
      x: state.direction.x * distance,
      y: state.direction.y * distance,
    },
  };
}
