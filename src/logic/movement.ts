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

export function constrainToBounds(
  position: Position,
  bounds: MovementBounds,
): Position {
  const width = Math.max(0, bounds.width);
  const height = Math.max(0, bounds.height);
  const paddingX = Math.min(Math.max(0, bounds.padding), width / 2);
  const paddingY = Math.min(Math.max(0, bounds.padding), height / 2);

  return {
    x: clamp(position.x, paddingX, width - paddingX),
    y: clamp(position.y, paddingY, height - paddingY),
  };
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
  return constrainToBounds(
    {
      x: position.x + directionX * distance,
      y: position.y + directionY * distance,
    },
    bounds,
  );
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
