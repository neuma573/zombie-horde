export function facingRotation(
  direction: { x: number; y: number },
  fallbackRotation = 0,
): number {
  if (
    !Number.isFinite(direction.x)
    || !Number.isFinite(direction.y)
    || (direction.x === 0 && direction.y === 0)
  ) {
    return fallbackRotation;
  }

  return Math.atan2(direction.y, direction.x);
}
