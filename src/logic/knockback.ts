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
