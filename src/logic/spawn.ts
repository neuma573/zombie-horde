import type { MovementBounds, Position } from './movement';

export function getEdgeSpawnPosition(
  spawnIndex: number,
  bounds: Omit<MovementBounds, 'padding'>,
  padding: number,
  avoidPosition?: Position,
  minDistance = 0,
): Position {
  const width = Math.max(0, bounds.width);
  const height = Math.max(0, bounds.height);
  const paddingX = Math.min(Math.max(0, padding), width / 2);
  const paddingY = Math.min(Math.max(0, padding), height / 2);
  const positions = [
    { x: width / 2, y: paddingY },
    { x: width - paddingX, y: height / 2 },
    { x: width / 2, y: height - paddingY },
    { x: paddingX, y: height / 2 },
  ];
  const normalizedIndex = Math.max(0, Math.floor(spawnIndex)) % positions.length;

  if (avoidPosition === undefined || minDistance <= 0) {
    return positions[normalizedIndex];
  }

  const orderedPositions = positions.map((_, offset) => (
    positions[(normalizedIndex + offset) % positions.length]
  ));
  const safePosition = orderedPositions.find((position) => (
    Math.hypot(position.x - avoidPosition.x, position.y - avoidPosition.y) >= minDistance
  ));

  return safePosition ?? orderedPositions.reduce((farthest, position) => {
    const farthestDistance = Math.hypot(
      farthest.x - avoidPosition.x,
      farthest.y - avoidPosition.y,
    );
    const distance = Math.hypot(position.x - avoidPosition.x, position.y - avoidPosition.y);
    return distance > farthestDistance ? position : farthest;
  });
}
