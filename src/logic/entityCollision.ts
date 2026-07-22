import {
  moveCircleWithObstacles,
  type RectangleObstacle,
} from './obstacleCollision';
import type { MovementBounds, Position } from './movement';

export interface PlayerCollisionBody {
  position: Position;
  previousPosition?: Position;
  radius: number;
}

export interface ZombieCollisionBody extends PlayerCollisionBody {
  id: string;
}

export interface PlayerZombieSeparationResult {
  playerPosition: Position;
  zombiePositions: Map<string, Position>;
}

const OVERLAP_EPSILON = 1e-6;
const MAXIMUM_SEPARATION_PASSES = 64;

function separationNormal(
  player: PlayerCollisionBody,
  zombie: ZombieCollisionBody,
): Position {
  const offsetX = zombie.position.x - player.position.x;
  const offsetY = zombie.position.y - player.position.y;
  const distance = Math.hypot(offsetX, offsetY);

  if (distance > OVERLAP_EPSILON) {
    return { x: offsetX / distance, y: offsetY / distance };
  }

  if (player.previousPosition && zombie.previousPosition) {
    const previousX = zombie.previousPosition.x - player.previousPosition.x;
    const previousY = zombie.previousPosition.y - player.previousPosition.y;
    const previousDistance = Math.hypot(previousX, previousY);

    if (previousDistance > OVERLAP_EPSILON) {
      return { x: previousX / previousDistance, y: previousY / previousDistance };
    }
  }

  return { x: 1, y: 0 };
}

function moveBySeparation(
  body: PlayerCollisionBody,
  normal: Position,
  distance: number,
  direction: -1 | 1,
  obstacles: readonly RectangleObstacle[],
  bounds: Omit<MovementBounds, 'padding'>,
): number {
  if (distance <= OVERLAP_EPSILON) return 0;

  const start = body.position;
  const resolved = moveCircleWithObstacles(
    start,
    {
      x: start.x + normal.x * distance * direction,
      y: start.y + normal.y * distance * direction,
    },
    body.radius,
    obstacles,
    { ...bounds, padding: Math.max(0, body.radius) },
  );
  body.position = resolved;

  return Math.max(0, (
    (resolved.x - start.x) * normal.x
      + (resolved.y - start.y) * normal.y
  ) * direction);
}

/**
 * Resolves only player-zombie overlap. Zombies are preferred as the movable
 * body; the player moves only when geometry prevents a zombie from yielding.
 * Zombie-zombie collision is intentionally outside this feature boundary.
 */
export function separatePlayerFromZombies(
  playerBody: PlayerCollisionBody,
  zombieBodies: readonly ZombieCollisionBody[],
  obstacles: readonly RectangleObstacle[],
  bounds: Omit<MovementBounds, 'padding'>,
): PlayerZombieSeparationResult {
  const player: PlayerCollisionBody = {
    ...playerBody,
    position: { ...playerBody.position },
    previousPosition: playerBody.previousPosition
      ? { ...playerBody.previousPosition }
      : undefined,
    radius: Math.max(0, playerBody.radius),
  };
  const zombies = [...zombieBodies]
    .map((zombie) => ({
      ...zombie,
      position: { ...zombie.position },
      previousPosition: zombie.previousPosition
        ? { ...zombie.previousPosition }
        : undefined,
      radius: Math.max(0, zombie.radius),
    }))
    .sort((left, right) => left.id.localeCompare(right.id));

  // Constrained moves near corners can resolve only part of an overlap at a
  // time. Finish all measurable progress in this update instead of relying on
  // later rendered frames. The cap protects physically impossible layouts.
  for (let pass = 0; pass < MAXIMUM_SEPARATION_PASSES; pass += 1) {
    let foundOverlap = false;
    let madeProgress = false;

    for (const zombie of zombies) {
      const offsetX = zombie.position.x - player.position.x;
      const offsetY = zombie.position.y - player.position.y;
      const distance = Math.hypot(offsetX, offsetY);
      const overlap = player.radius + zombie.radius - distance;

      if (overlap <= OVERLAP_EPSILON) continue;

      foundOverlap = true;
      const normal = separationNormal(player, zombie);
      const zombieMovement = moveBySeparation(
        zombie,
        normal,
        overlap,
        1,
        obstacles,
        bounds,
      );
      const remaining = Math.max(0, overlap - zombieMovement);
      const playerMovement = moveBySeparation(
        player,
        normal,
        remaining,
        -1,
        obstacles,
        bounds,
      );
      madeProgress = madeProgress
        || zombieMovement > OVERLAP_EPSILON
        || playerMovement > OVERLAP_EPSILON;
    }

    if (!foundOverlap || !madeProgress) break;
  }

  return {
    playerPosition: { ...player.position },
    zombiePositions: new Map(
      zombies.map((zombie) => [zombie.id, { ...zombie.position }]),
    ),
  };
}
