import type { Vector2 } from './hitscan';

export interface ZombieHitReactionConfig {
  durationMs: number;
  recoilDistance: number;
  recoilRotationRadians: number;
}

export interface ZombieHitReactionState {
  remainingMs: number;
  localDirection: Vector2;
}

export interface ZombieHitReactionPose {
  offset: Vector2;
  rotation: number;
  upperArmOffset: Vector2;
  lowerArmOffset: Vector2;
}

const VECTOR_EPSILON = 1e-9;

function normalizedDirection(direction: Vector2): Vector2 {
  const length = Math.hypot(direction.x, direction.y);
  if (!Number.isFinite(length) || length <= VECTOR_EPSILON) return { x: 1, y: 0 };
  return { x: direction.x / length, y: direction.y / length };
}

export function createZombieHitReaction(
  worldDirection: Vector2,
  zombieRotation: number,
  config: ZombieHitReactionConfig,
): ZombieHitReactionState {
  const direction = normalizedDirection(worldDirection);
  const rotation = Number.isFinite(zombieRotation) ? zombieRotation : 0;
  const cosine = Math.cos(-rotation);
  const sine = Math.sin(-rotation);

  return {
    remainingMs: Number.isFinite(config.durationMs) ? Math.max(0, config.durationMs) : 0,
    localDirection: {
      x: direction.x * cosine - direction.y * sine,
      y: direction.x * sine + direction.y * cosine,
    },
  };
}

export function advanceZombieHitReaction(
  state: ZombieHitReactionState | null,
  deltaMs: number,
): ZombieHitReactionState | null {
  if (state === null) return null;
  const elapsed = Number.isFinite(deltaMs) ? Math.max(0, deltaMs) : 0;
  const remainingMs = Math.max(0, state.remainingMs - elapsed);
  return remainingMs > 0 ? { ...state, remainingMs } : null;
}

export function resolveZombieHitReactionPose(
  state: ZombieHitReactionState | null,
  config: ZombieHitReactionConfig,
): ZombieHitReactionPose {
  const durationMs = Number.isFinite(config.durationMs) ? Math.max(0, config.durationMs) : 0;
  if (state === null || durationMs <= 0) {
    return {
      offset: { x: 0, y: 0 },
      rotation: 0,
      upperArmOffset: { x: 0, y: 0 },
      lowerArmOffset: { x: 0, y: 0 },
    };
  }

  const remainingRatio = Math.min(1, Math.max(0, state.remainingMs / durationMs));
  const impulse = remainingRatio * remainingRatio;
  const recoilDistance = Number.isFinite(config.recoilDistance)
    ? Math.max(0, config.recoilDistance)
    : 0;
  const recoilRotation = Number.isFinite(config.recoilRotationRadians)
    ? Math.max(0, config.recoilRotationRadians)
    : 0;

  return {
    offset: {
      x: state.localDirection.x * recoilDistance * impulse,
      y: state.localDirection.y * recoilDistance * impulse,
    },
    rotation: state.localDirection.y * recoilRotation * impulse,
    upperArmOffset: {
      x: -10 * impulse,
      y: (-11 + state.localDirection.y * 4) * impulse,
    },
    lowerArmOffset: {
      x: -7 * impulse,
      y: (9 + state.localDirection.y * 6) * impulse,
    },
  };
}
