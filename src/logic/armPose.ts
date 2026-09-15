import type { Vector2 } from './hitscan';

/** Two fixed-length bones, with an outward elbow and a reachable hand target. */
export function resolveArmPose(
  shoulder: Vector2,
  target: Vector2,
  upperLength: number,
  forearmLength: number,
  bend: -1 | 1,
  maximumFlexion = Math.PI,
): { elbow: Vector2; hand: Vector2 } {
  const dx = target.x - shoulder.x;
  const dy = target.y - shoulder.y;
  const angle = Math.atan2(dy, dx);
  const minimumReach = Math.sqrt(Math.max(0,
    upperLength ** 2 + forearmLength ** 2
      + 2 * upperLength * forearmLength * Math.cos(maximumFlexion),
  ));
  const distance = Math.min(upperLength + forearmLength - 0.001,
    Math.max(minimumReach, Math.abs(upperLength - forearmLength) + 0.001, Math.hypot(dx, dy)));
  const offset = Math.acos(Math.min(1, Math.max(-1,
    (upperLength ** 2 + distance ** 2 - forearmLength ** 2) / (2 * upperLength * distance),
  )));
  return {
    elbow: {
      x: shoulder.x + Math.cos(angle + bend * offset) * upperLength,
      y: shoulder.y + Math.sin(angle + bend * offset) * upperLength,
    },
    hand: { x: shoulder.x + Math.cos(angle) * distance, y: shoulder.y + Math.sin(angle) * distance },
  };
}
