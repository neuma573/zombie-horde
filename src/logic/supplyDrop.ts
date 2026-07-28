import type { Position } from './movement';
import type { RectangleObstacle } from './obstacleCollision';
import type { AmmoType, WeaponInventoryState } from './weapon';

export interface SupplyDropConfig {
  target: Position;
  announcementDurationMs: number;
  flyoverDurationMs: number;
  dropDelayMs: number;
  fallDurationMs: number;
  planeTravel: Position;
  fallHeight: number;
  indicatorMargin: number;
  crateHealth: number;
  crateSize: { width: number; height: number };
  interactionRange: number;
}

export type SupplyDropKind = 'normal' | 'emergency';

export interface SupplyTriggerConfig {
  normalBaseChance: number;
  consecutiveMissChanceBonus: number;
  lowAmmoChanceBonus: number;
  criticalHealthChanceBonus: number;
  criticalHealthRatio: number;
  lowAmmoRatio: number;
}

export interface SupplyTriggerState {
  consecutiveMisses: number;
}

export interface SupplyTriggerInput {
  activeSupply: boolean;
  waveCleared: boolean;
  allAmmoDepleted: boolean;
  ammoRatio: number;
  healthRatio: number;
  randomValue: number;
}

export interface SupplyLocationConfig {
  sampleCount: number;
  clearance: number;
  normalMinimumPlayerDistance: number;
  normalMaximumPlayerDistance: number;
  emergencyMinimumPlayerDistance: number;
  previousDropMinimumDistance: number;
}

export type SupplyDropPhase =
  | 'announced'
  | 'flyover'
  | 'drop-pending'
  | 'falling'
  | 'landed';

export interface SupplyDropState {
  elapsedMs: number;
  crateHealth: number;
  crateOpened: boolean;
}

export interface SupplyDropSnapshot {
  phase: SupplyDropPhase;
  target: Position;
  planePosition: Position;
  planeRotation: number;
  planeProgress: number;
  planeVisible: boolean;
  cratePosition: Position;
  fallProgress: number;
  smokeElapsedMs: number;
  crateDestroyed: boolean;
  crateOpened: boolean;
}

export interface SupplyDropIndicator {
  visible: boolean;
  position: Position;
  rotation: number;
}

export interface SupplyDropCrateBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

export function createSupplyDropState(crateHealth = 100): SupplyDropState {
  return {
    elapsedMs: 0,
    crateHealth: Math.max(0, finite(crateHealth)),
    crateOpened: false,
  };
}

export function createSupplyTriggerState(): SupplyTriggerState {
  return { consecutiveMisses: 0 };
}

export function totalAvailableAmmo(
  inventory: Readonly<WeaponInventoryState>,
  reserves: Readonly<Record<AmmoType, number>>,
): { current: number; capacity: number } {
  const owned = inventory.slots.filter((weapon) => weapon !== null);
  const ammoTypes = new Set(owned.map((weapon) => weapon.definition.ammoType));
  const current = owned.reduce(
    (total, weapon) => total + Math.max(0, weapon.state.magazineAmmo),
    0,
  ) + [...ammoTypes].reduce(
    (total, ammoType) => total + Math.max(0, reserves[ammoType]),
    0,
  );
  const capacity = owned.reduce(
    (total, weapon) => (
      total + weapon.definition.config.magazineSize + weapon.definition.config.reserveAmmo
    ),
    0,
  );
  return { current, capacity };
}

export function resolveSupplyTrigger(
  state: SupplyTriggerState,
  input: SupplyTriggerInput,
  config: SupplyTriggerConfig,
): { state: SupplyTriggerState; kind: SupplyDropKind | null; chance: number } {
  if (input.activeSupply) return { state, kind: null, chance: 0 };
  if (input.allAmmoDepleted) {
    return {
      state: createSupplyTriggerState(),
      kind: 'emergency',
      chance: 1,
    };
  }
  if (!input.waveCleared) return { state, kind: null, chance: 0 };

  const ammoRatio = clamp01(input.ammoRatio);
  const healthRatio = clamp01(input.healthRatio);
  const lowAmmoFactor = ammoRatio >= config.lowAmmoRatio
    ? 0
    : 1 - ammoRatio / Math.max(Number.EPSILON, config.lowAmmoRatio);
  const chance = clamp01(
    config.normalBaseChance
      + state.consecutiveMisses * config.consecutiveMissChanceBonus
      + lowAmmoFactor * config.lowAmmoChanceBonus
      + (healthRatio <= config.criticalHealthRatio
        ? config.criticalHealthChanceBonus
        : 0),
  );
  if (clamp01(input.randomValue) < chance) {
    return {
      state: createSupplyTriggerState(),
      kind: 'normal',
      chance,
    };
  }
  return {
    state: { consecutiveMisses: state.consecutiveMisses + 1 },
    kind: null,
    chance,
  };
}

export function selectSupplyDropLocation(
  kind: SupplyDropKind,
  player: Position,
  bounds: { width: number; height: number },
  obstacles: readonly RectangleObstacle[],
  previousDrop: Position | null,
  threatDirection: Position,
  seed: number,
  config: SupplyLocationConfig,
): Position | null {
  const clearance = Math.max(0, config.clearance);
  const reachable = reachableCells(player, bounds, obstacles, clearance);
  if (reachable.length === 0) return null;

  const candidates = Array.from(
    { length: Math.max(1, Math.floor(config.sampleCount)) },
    (_, index) => reachable[mixUint32(seed + index * 0x9e3779b9) % reachable.length],
  ).filter((candidate): candidate is Position => candidate !== undefined);
  const previousDistance = Math.max(0, config.previousDropMinimumDistance);
  const filtered = candidates.filter((candidate) => {
    const playerDistance = distance(candidate, player);
    if (previousDrop && distance(candidate, previousDrop) < previousDistance) return false;
    return kind === 'normal'
      ? playerDistance >= config.normalMinimumPlayerDistance
        && playerDistance <= config.normalMaximumPlayerDistance
      : playerDistance >= config.emergencyMinimumPlayerDistance;
  });
  const pool = filtered.length > 0
    ? filtered
    : candidates.filter((candidate) => (
      !previousDrop || distance(candidate, previousDrop) >= previousDistance * 0.5
    ));
  if (pool.length === 0) return null;

  const threatLength = Math.hypot(threatDirection.x, threatDirection.y);
  return pool.reduce((best, candidate) => {
    const score = locationScore(kind, candidate, player, threatDirection, threatLength, seed);
    return score > best.score ? { position: candidate, score } : best;
  }, { position: pool[0], score: Number.NEGATIVE_INFINITY }).position;
}

export function advanceSupplyDrop(
  state: SupplyDropState,
  deltaMs: number,
): SupplyDropState {
  const safeDeltaMs = Number.isFinite(deltaMs) ? Math.max(0, deltaMs) : 0;
  return {
    elapsedMs: state.elapsedMs + safeDeltaMs,
    crateHealth: state.crateHealth,
    crateOpened: state.crateOpened,
  };
}

export function damageSupplyDropCrate(
  state: SupplyDropState,
  damage: number,
): { state: SupplyDropState; died: boolean } {
  const wasAlive = state.crateHealth > 0;
  const crateHealth = Math.max(
    0,
    state.crateHealth - Math.max(0, finite(damage)),
  );

  return {
    state: {
      ...state,
      crateHealth,
      crateOpened: state.crateOpened || (wasAlive && crateHealth === 0),
    },
    died: wasAlive && crateHealth === 0,
  };
}

export function resolveSupplyDropSnapshot(
  state: SupplyDropState,
  config: SupplyDropConfig,
): SupplyDropSnapshot {
  const announcementEnd = duration(config.announcementDurationMs);
  const flyoverEnd = announcementEnd + duration(config.flyoverDurationMs);
  const dropStart = announcementEnd + Math.min(
    duration(config.dropDelayMs),
    duration(config.flyoverDurationMs),
  );
  const fallingEnd = dropStart + duration(config.fallDurationMs);
  const elapsedMs = Math.max(0, finite(state.elapsedMs));
  const planeProgress = progress(
    elapsedMs,
    announcementEnd,
    flyoverEnd,
  );
  const fallProgress = progress(elapsedMs, dropStart, fallingEnd);
  const dropPlaneProgress = progress(
    dropStart,
    announcementEnd,
    flyoverEnd,
  );
  const travelX = finite(config.planeTravel.x);
  const travelY = finite(config.planeTravel.y);
  const target = {
    x: finite(config.target.x),
    y: finite(config.target.y),
  };

  return {
    phase: elapsedMs < announcementEnd
      ? 'announced'
      : elapsedMs < dropStart
        ? 'flyover'
        : elapsedMs < fallingEnd
          ? 'falling'
          : 'landed',
    target,
    planePosition: {
      x: target.x + (planeProgress - dropPlaneProgress) * travelX,
      y: target.y + (planeProgress - dropPlaneProgress) * travelY,
    },
    planeRotation: Math.atan2(travelY, travelX),
    planeProgress,
    planeVisible: elapsedMs >= announcementEnd && elapsedMs < flyoverEnd,
    cratePosition: {
      x: target.x,
      y: target.y - Math.max(0, finite(config.fallHeight)) * (1 - fallProgress),
    },
    fallProgress,
    smokeElapsedMs: Math.max(0, elapsedMs - fallingEnd),
    crateDestroyed: state.crateHealth <= 0,
    crateOpened: state.crateOpened,
  };
}

export function resolveSupplyDropIndicator(
  targetScreen: Position,
  viewport: { width: number; height: number },
  margin: number,
): SupplyDropIndicator {
  const width = Math.max(0, finite(viewport.width));
  const height = Math.max(0, finite(viewport.height));
  const safeMargin = Math.max(0, Math.min(
    finite(margin),
    width / 2,
    height / 2,
  ));
  const x = finite(targetScreen.x);
  const y = finite(targetScreen.y);
  const visible = (
    x < safeMargin
    || x > width - safeMargin
    || y < safeMargin
    || y > height - safeMargin
  );
  const center = { x: width / 2, y: height / 2 };

  return {
    visible,
    position: {
      x: Math.min(width - safeMargin, Math.max(safeMargin, x)),
      y: Math.min(height - safeMargin, Math.max(safeMargin, y)),
    },
    rotation: Math.atan2(y - center.y, x - center.x),
  };
}

export function resolveSupplyDropCrateBounds(
  snapshot: SupplyDropSnapshot,
  config: SupplyDropConfig,
): SupplyDropCrateBounds | null {
  if (
    snapshot.phase !== 'landed'
    || snapshot.crateDestroyed
    || snapshot.crateOpened
  ) {
    return null;
  }

  const width = Math.max(0, finite(config.crateSize.width));
  const height = Math.max(0, finite(config.crateSize.height));
  return {
    x: snapshot.target.x - width / 2,
    y: snapshot.target.y - height / 2,
    width,
    height,
  };
}

export function canOpenSupplyDropCrate(
  snapshot: SupplyDropSnapshot,
  player: Position,
  config: SupplyDropConfig,
): boolean {
  if (
    snapshot.phase !== 'landed'
    || snapshot.crateOpened
    || snapshot.crateDestroyed
  ) {
    return false;
  }

  return Math.hypot(
    finite(player.x) - snapshot.target.x,
    finite(player.y) - snapshot.target.y,
  ) <= Math.max(0, finite(config.interactionRange));
}

export function openSupplyDropCrate(
  state: SupplyDropState,
): SupplyDropState {
  if (state.crateHealth <= 0) return state;
  return { ...state, crateOpened: true };
}

function progress(value: number, start: number, end: number): number {
  if (end <= start) return value >= end ? 1 : 0;
  return Math.min(1, Math.max(0, (value - start) / (end - start)));
}

function duration(value: number): number {
  return Math.max(0, finite(value));
}

function finite(value: number): number {
  return Number.isFinite(value) ? value : 0;
}

function reachableCells(
  start: Position,
  bounds: { width: number; height: number },
  obstacles: readonly RectangleObstacle[],
  clearance: number,
): Position[] {
  const cellSize = Math.max(32, clearance * 2);
  const columns = Math.max(1, Math.floor(bounds.width / cellSize));
  const rows = Math.max(1, Math.floor(bounds.height / cellSize));
  const cellCenter = (column: number, row: number): Position => ({
    x: Math.min(bounds.width - clearance, Math.max(clearance, (column + 0.5) * cellSize)),
    y: Math.min(bounds.height - clearance, Math.max(clearance, (row + 0.5) * cellSize)),
  });
  const valid = (column: number, row: number): boolean => {
    if (column < 0 || row < 0 || column >= columns || row >= rows) return false;
    const position = cellCenter(column, row);
    return !obstacles.some((obstacle) => (
      position.x >= obstacle.x - clearance
      && position.x <= obstacle.x + obstacle.width + clearance
      && position.y >= obstacle.y - clearance
      && position.y <= obstacle.y + obstacle.height + clearance
    ));
  };
  let startColumn = Math.min(columns - 1, Math.max(0, Math.floor(start.x / cellSize)));
  let startRow = Math.min(rows - 1, Math.max(0, Math.floor(start.y / cellSize)));
  if (!valid(startColumn, startRow)) {
    const fallback = Array.from({ length: columns * rows }, (_, index) => ({
      column: index % columns,
      row: Math.floor(index / columns),
    })).find(({ column, row }) => valid(column, row));
    if (!fallback) return [];
    startColumn = fallback.column;
    startRow = fallback.row;
  }
  const queue = [{ column: startColumn, row: startRow }];
  const visited = new Set([`${startColumn}:${startRow}`]);
  const result: Position[] = [];
  for (let index = 0; index < queue.length; index += 1) {
    const current = queue[index];
    result.push(cellCenter(current.column, current.row));
    for (const [column, row] of [
      [current.column + 1, current.row],
      [current.column - 1, current.row],
      [current.column, current.row + 1],
      [current.column, current.row - 1],
    ]) {
      const key = `${column}:${row}`;
      if (!visited.has(key) && valid(column, row)) {
        visited.add(key);
        queue.push({ column, row });
      }
    }
  }
  return result;
}

function locationScore(
  kind: SupplyDropKind,
  candidate: Position,
  player: Position,
  threatDirection: Position,
  threatLength: number,
  seed: number,
): number {
  const offset = { x: candidate.x - player.x, y: candidate.y - player.y };
  const playerDistance = Math.hypot(offset.x, offset.y);
  const threatAlignment = threatLength <= Number.EPSILON || playerDistance <= Number.EPSILON
    ? 0
    : (offset.x * threatDirection.x + offset.y * threatDirection.y)
      / (playerDistance * threatLength);
  const jitter = mixUint32(
    seed ^ Math.round(candidate.x * 31) ^ Math.round(candidate.y * 131),
  ) / 0x1_0000_0000;
  return kind === 'emergency'
    ? playerDistance + threatAlignment * 240 + jitter * 40
    : jitter;
}

function distance(left: Position, right: Position): number {
  return Math.hypot(left.x - right.x, left.y - right.y);
}

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, finite(value)));
}

function mixUint32(value: number): number {
  let mixed = value >>> 0;
  mixed = Math.imul(mixed ^ (mixed >>> 16), 0x45d9f3b);
  mixed = Math.imul(mixed ^ (mixed >>> 16), 0x45d9f3b);
  return (mixed ^ (mixed >>> 16)) >>> 0;
}
