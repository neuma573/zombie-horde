export interface Position {
  x: number;
  y: number;
}

export interface MovementInput {
  x: number;
  y: number;
}

export interface MovementBounds {
  width: number;
  height: number;
  padding: number;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export function moveWithinBounds(
  position: Position,
  input: MovementInput,
  speed: number,
  deltaMs: number,
  bounds: MovementBounds,
): Position {
  const inputLength = Math.hypot(input.x, input.y);
  const deltaSeconds = Math.max(0, deltaMs) / 1_000;
  const distance = speed * deltaSeconds;
  const directionX = inputLength > 0 ? input.x / inputLength : 0;
  const directionY = inputLength > 0 ? input.y / inputLength : 0;
  const minX = bounds.padding;
  const maxX = Math.max(minX, bounds.width - bounds.padding);
  const minY = bounds.padding;
  const maxY = Math.max(minY, bounds.height - bounds.padding);

  return {
    x: clamp(position.x + directionX * distance, minX, maxX),
    y: clamp(position.y + directionY * distance, minY, maxY),
  };
}

export function moveToward(
  position: Position,
  target: Position,
  speed: number,
  deltaMs: number,
): Position {
  const offsetX = target.x - position.x;
  const offsetY = target.y - position.y;
  const distanceToTarget = Math.hypot(offsetX, offsetY);

  if (distanceToTarget === 0) {
    return { ...position };
  }

  const travelDistance = Math.min(
    distanceToTarget,
    Math.max(0, speed) * Math.max(0, deltaMs) / 1_000,
  );

  return {
    x: position.x + offsetX / distanceToTarget * travelDistance,
    y: position.y + offsetY / distanceToTarget * travelDistance,
  };
}
