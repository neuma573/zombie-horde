import type { MovementBounds, Position } from './movement';

type SpawnEdge = 0 | 1 | 2 | 3;

function mixUint32(value: number): number {
  let mixed = value >>> 0;
  mixed = Math.imul(mixed ^ (mixed >>> 16), 0x45d9f3b);
  mixed = Math.imul(mixed ^ (mixed >>> 16), 0x45d9f3b);
  return (mixed ^ (mixed >>> 16)) >>> 0;
}

function shuffledEdges(cycle: number, seed: number): SpawnEdge[] {
  const edges: SpawnEdge[] = [0, 1, 2, 3];
  let state = mixUint32((seed >>> 0) ^ Math.imul(cycle + 1, 0x9e3779b9));

  for (let index = edges.length - 1; index > 0; index -= 1) {
    state = mixUint32(state + index);
    const swapIndex = state % (index + 1);
    [edges[index], edges[swapIndex]] = [edges[swapIndex], edges[index]];
  }

  return edges;
}

function radicalInverseBase2(value: number): number {
  let remaining = Math.max(0, Math.floor(value));
  let fraction = 0;
  let place = 0.5;

  while (remaining > 0) {
    fraction += (remaining % 2) * place;
    remaining = Math.floor(remaining / 2);
    place *= 0.5;
  }

  return fraction;
}

function positionOnEdge(
  spawnIndex: number,
  edge: SpawnEdge,
  width: number,
  height: number,
  paddingX: number,
  paddingY: number,
): Position {
  const cycle = Math.floor(spawnIndex / 4);
  const edgeProgress = radicalInverseBase2(cycle + 1 + edge * 2);
  const x = paddingX + (width - paddingX * 2) * edgeProgress;
  const y = paddingY + (height - paddingY * 2) * edgeProgress;

  switch (edge) {
    case 0:
      return { x, y: paddingY };
    case 1:
      return { x: width - paddingX, y };
    case 2:
      return { x, y: height - paddingY };
    case 3:
      return { x: paddingX, y };
  }
}

export function getEdgeSpawnPosition(
  spawnIndex: number,
  bounds: Omit<MovementBounds, 'padding'>,
  padding: number,
  avoidPosition?: Position,
  minDistance = 0,
  seed = 0,
): Position {
  const width = Math.max(0, bounds.width);
  const height = Math.max(0, bounds.height);
  const paddingX = Math.min(Math.max(0, padding), width / 2);
  const paddingY = Math.min(Math.max(0, padding), height / 2);
  const normalizedIndex = Math.max(0, Math.floor(spawnIndex));
  const cycle = Math.floor(normalizedIndex / 4);
  const edgeOrder = shuffledEdges(cycle, seed);
  const scheduledOffset = normalizedIndex % edgeOrder.length;
  const positions = Array.from({ length: 4 }, (_, offset) => {
    const edge = edgeOrder[(scheduledOffset + offset) % edgeOrder.length];
    return positionOnEdge(
      normalizedIndex,
      edge,
      width,
      height,
      paddingX,
      paddingY,
    );
  });

  if (avoidPosition === undefined || minDistance <= 0) {
    return positions[0];
  }

  const safePosition = positions.find((position) => (
    Math.hypot(position.x - avoidPosition.x, position.y - avoidPosition.y) >= minDistance
  ));

  return safePosition ?? positions.reduce((farthest, position) => {
    const farthestDistance = Math.hypot(
      farthest.x - avoidPosition.x,
      farthest.y - avoidPosition.y,
    );
    const distance = Math.hypot(position.x - avoidPosition.x, position.y - avoidPosition.y);
    return distance > farthestDistance ? position : farthest;
  });
}
