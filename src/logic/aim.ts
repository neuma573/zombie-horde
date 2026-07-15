import type { Vector2 } from './hitscan';

const AIM_EPSILON = 1e-8;

export function resolveAimDirection(candidate: Vector2, lastValid: Vector2): Vector2 {
  const length = Math.hypot(candidate.x, candidate.y);

  if (length < AIM_EPSILON) {
    return { ...lastValid };
  }

  return {
    x: candidate.x / length,
    y: candidate.y / length,
  };
}
