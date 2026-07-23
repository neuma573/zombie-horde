import type { Position } from './movement';
import type {
  ZombieCandidatePair,
  ZombieSpatialEntry,
  ZombieSpatialQueryResult,
} from './zombieSpatialGrid';

export interface ZombieCrowdSpacingConfig {
  minimumDistanceRatio: number;
  maximumSeparationSpeed: number;
}

export interface ZombieCrowdSpacingResult {
  velocities: Map<string, Position>;
  valid: boolean;
}

interface AccumulatedVelocity extends Position {
  count: number;
}

const VECTOR_EPSILON = 1e-9;

function compareIds(first: string, second: string): number {
  if (first < second) return -1;
  if (first > second) return 1;
  return 0;
}

function canonicalPair(firstId: string, secondId: string): ZombieCandidatePair {
  return compareIds(firstId, secondId) <= 0
    ? { firstId, secondId }
    : { firstId: secondId, secondId: firstId };
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(Math.max(value, minimum), maximum);
}

function clampMagnitude(vector: Position, maximum: number): Position {
  const length = Math.hypot(vector.x, vector.y);
  if (length === 0 || length <= maximum) return { ...vector };
  return {
    x: vector.x / length * maximum,
    y: vector.y / length * maximum,
  };
}

function fallbackPairNormal(firstId: string, secondId: string): Position {
  let hash = 2166136261;
  const key = `${firstId}:${secondId}`;

  for (let index = 0; index < key.length; index += 1) {
    hash ^= key.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  const angle = (hash >>> 0) / 0xffffffff * Math.PI * 2;
  return { x: Math.cos(angle), y: Math.sin(angle) };
}

function normalizedConfig(
  config: ZombieCrowdSpacingConfig,
  zombieSpeed: number,
): ZombieCrowdSpacingConfig {
  const safeSpeed = Number.isFinite(zombieSpeed) ? Math.max(0, zombieSpeed) : 0;
  const ratio = Number.isFinite(config.minimumDistanceRatio)
    ? clamp(config.minimumDistanceRatio, 0, 1)
    : 0;
  const requestedSpeed = Number.isFinite(config.maximumSeparationSpeed)
    ? Math.max(0, config.maximumSeparationSpeed)
    : 0;

  return {
    minimumDistanceRatio: ratio,
    maximumSeparationSpeed: Math.min(
      requestedSpeed,
      Math.max(0, safeSpeed - VECTOR_EPSILON),
    ),
  };
}

function invalidResult(): ZombieCrowdSpacingResult {
  return { velocities: new Map(), valid: false };
}

export function resolveZombieCrowdSpacing(
  entries: readonly ZombieSpatialEntry[],
  candidateQuery: ZombieSpatialQueryResult,
  config: ZombieCrowdSpacingConfig,
  zombieSpeed: number,
): ZombieCrowdSpacingResult {
  if (!candidateQuery.valid || !candidateQuery.complete) return invalidResult();

  const entryById = new Map<string, ZombieSpatialEntry>();
  for (const entry of entries) {
    if (
      entry.id.length === 0
      || entryById.has(entry.id)
      || !Number.isFinite(entry.position.x)
      || !Number.isFinite(entry.position.y)
    ) {
      return invalidResult();
    }

    entryById.set(entry.id, {
      ...entry,
      position: { ...entry.position },
      radius: Number.isFinite(entry.radius) ? Math.max(0, entry.radius) : 0,
    });
  }

  const normalizedPairs: ZombieCandidatePair[] = [];
  for (const pair of candidateQuery.pairs) {
    const canonical = canonicalPair(pair.firstId, pair.secondId);
    if (
      canonical.firstId === canonical.secondId
      || !entryById.has(canonical.firstId)
      || !entryById.has(canonical.secondId)
    ) {
      return invalidResult();
    }
    normalizedPairs.push(canonical);
  }

  normalizedPairs.sort((first, second) => (
    compareIds(first.firstId, second.firstId)
      || compareIds(first.secondId, second.secondId)
  ));
  const pairs = normalizedPairs.filter((pair, index) => (
    index === 0
    || pair.firstId !== normalizedPairs[index - 1].firstId
    || pair.secondId !== normalizedPairs[index - 1].secondId
  ));
  const safeConfig = normalizedConfig(config, zombieSpeed);
  const accumulated = new Map<string, AccumulatedVelocity>();

  for (const id of [...entryById.keys()].sort(compareIds)) {
    accumulated.set(id, { x: 0, y: 0, count: 0 });
  }

  for (const pair of pairs) {
    const first = entryById.get(pair.firstId)!;
    const second = entryById.get(pair.secondId)!;
    const minimumDistance = (first.radius + second.radius)
      * safeConfig.minimumDistanceRatio;
    if (minimumDistance <= VECTOR_EPSILON) continue;

    const offsetX = second.position.x - first.position.x;
    const offsetY = second.position.y - first.position.y;
    const distance = Math.hypot(offsetX, offsetY);
    const penetration = minimumDistance - distance;
    if (penetration <= VECTOR_EPSILON) continue;

    const normal = distance > VECTOR_EPSILON
      ? { x: offsetX / distance, y: offsetY / distance }
      : fallbackPairNormal(pair.firstId, pair.secondId);
    const strength = safeConfig.maximumSeparationSpeed
      * clamp(penetration / minimumDistance, 0, 1);
    const firstVelocity = accumulated.get(first.id)!;
    const secondVelocity = accumulated.get(second.id)!;

    firstVelocity.x -= normal.x * strength;
    firstVelocity.y -= normal.y * strength;
    firstVelocity.count += 1;
    secondVelocity.x += normal.x * strength;
    secondVelocity.y += normal.y * strength;
    secondVelocity.count += 1;
  }

  const velocities = new Map<string, Position>();
  for (const [id, velocity] of accumulated) {
    const combined = velocity.count > 0
      ? { x: velocity.x, y: velocity.y }
      : { x: 0, y: 0 };
    velocities.set(
      id,
      clampMagnitude(combined, safeConfig.maximumSeparationSpeed),
    );
  }

  return { velocities, valid: true };
}

export function zombieVelocityWithCrowdSpacing(
  position: Position,
  target: Position,
  zombieSpeed: number,
  separationVelocity: Position,
): Position {
  const safeSpeed = Number.isFinite(zombieSpeed) ? Math.max(0, zombieSpeed) : 0;
  const offsetX = target.x - position.x;
  const offsetY = target.y - position.y;
  const distance = Math.hypot(offsetX, offsetY);
  const chaseVelocity = distance > VECTOR_EPSILON
    ? { x: offsetX / distance * safeSpeed, y: offsetY / distance * safeSpeed }
    : { x: 0, y: 0 };
  const safeSeparation = {
    x: Number.isFinite(separationVelocity.x) ? separationVelocity.x : 0,
    y: Number.isFinite(separationVelocity.y) ? separationVelocity.y : 0,
  };
  const limitedSeparation = clampMagnitude(
    safeSeparation,
    Math.max(0, safeSpeed - VECTOR_EPSILON),
  );

  return clampMagnitude({
    x: chaseVelocity.x + limitedSeparation.x,
    y: chaseVelocity.y + limitedSeparation.y,
  }, safeSpeed);
}

export function moveZombieWithCrowdSpacing(
  position: Position,
  target: Position,
  velocity: Position,
  deltaMs: number,
): Position {
  const safeVelocity = {
    x: Number.isFinite(velocity.x) ? velocity.x : 0,
    y: Number.isFinite(velocity.y) ? velocity.y : 0,
  };
  const deltaSeconds = Number.isFinite(deltaMs) ? Math.max(0, deltaMs) / 1_000 : 0;
  const displacement = {
    x: safeVelocity.x * deltaSeconds,
    y: safeVelocity.y * deltaSeconds,
  };
  const targetOffset = {
    x: target.x - position.x,
    y: target.y - position.y,
  };
  const distanceToTarget = Math.hypot(targetOffset.x, targetOffset.y);

  if (distanceToTarget > VECTOR_EPSILON) {
    const targetDirection = {
      x: targetOffset.x / distanceToTarget,
      y: targetOffset.y / distanceToTarget,
    };
    const forwardDistance = displacement.x * targetDirection.x
      + displacement.y * targetDirection.y;

    if (forwardDistance > distanceToTarget) {
      const excess = forwardDistance - distanceToTarget;
      displacement.x -= targetDirection.x * excess;
      displacement.y -= targetDirection.y * excess;
    }
  }

  return {
    x: position.x + displacement.x,
    y: position.y + displacement.y,
  };
}
