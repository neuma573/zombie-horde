import type { RectangleObstacle } from './obstacleCollision';
import type { Position } from './movement';

export interface NavigationGrid {
  width: number;
  height: number;
  cellSize: number;
  columns: number;
  rows: number;
  blocked: readonly boolean[];
}

export interface NavigationFlowField {
  distances: readonly number[];
  targetIndex: number;
}

const POSITION_EPSILON = 1e-7;

export function hasClearPath(
  start: Position,
  target: Position,
  clearance: number,
  obstacles: readonly RectangleObstacle[],
  targetTolerance = 0,
): boolean {
  const targetOffsetX = target.x - start.x;
  const targetOffsetY = target.y - start.y;
  const targetDistance = Math.hypot(targetOffsetX, targetOffsetY);
  const checkedDistance = Math.max(0, targetDistance - Math.max(0, targetTolerance));
  const distanceScale = targetDistance > POSITION_EPSILON ? checkedDistance / targetDistance : 0;
  const deltaX = targetOffsetX * distanceScale;
  const deltaY = targetOffsetY * distanceScale;
  const safeClearance = Math.max(0, clearance);

  return !obstacles.some((obstacle) => {
    const left = Math.min(obstacle.x, obstacle.x + obstacle.width) - safeClearance;
    const right = Math.max(obstacle.x, obstacle.x + obstacle.width) + safeClearance;
    const top = Math.min(obstacle.y, obstacle.y + obstacle.height) - safeClearance;
    const bottom = Math.max(obstacle.y, obstacle.y + obstacle.height) + safeClearance;
    let entry = 0;
    let exit = 1;

    for (const [origin, delta, min, max] of [
      [start.x, deltaX, left, right],
      [start.y, deltaY, top, bottom],
    ] as const) {
      if (Math.abs(delta) <= POSITION_EPSILON) {
        if (origin < min || origin > max) return false;
        continue;
      }
      const first = (min - origin) / delta;
      const second = (max - origin) / delta;
      entry = Math.max(entry, Math.min(first, second));
      exit = Math.min(exit, Math.max(first, second));
      if (entry > exit) return false;
    }

    return entry <= exit;
  });
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function circleIntersectsRectangle(
  center: Position,
  radius: number,
  obstacle: RectangleObstacle,
): boolean {
  const right = obstacle.x + obstacle.width;
  const bottom = obstacle.y + obstacle.height;
  const left = Math.min(obstacle.x, right);
  const top = Math.min(obstacle.y, bottom);
  const closestX = clamp(center.x, left, Math.max(obstacle.x, right));
  const closestY = clamp(center.y, top, Math.max(obstacle.y, bottom));
  const offsetX = center.x - closestX;
  const offsetY = center.y - closestY;
  return offsetX * offsetX + offsetY * offsetY <= radius * radius;
}

export function cellCenter(grid: NavigationGrid, index: number): Position {
  const column = index % grid.columns;
  const row = Math.floor(index / grid.columns);
  return {
    x: Math.min(grid.width, (column + 0.5) * grid.cellSize),
    y: Math.min(grid.height, (row + 0.5) * grid.cellSize),
  };
}

export function cellIndexAt(grid: NavigationGrid, position: Position): number {
  const column = clamp(Math.floor(position.x / grid.cellSize), 0, grid.columns - 1);
  const row = clamp(Math.floor(position.y / grid.cellSize), 0, grid.rows - 1);
  return row * grid.columns + column;
}

function neighbors(grid: NavigationGrid, index: number): number[] {
  const column = index % grid.columns;
  const row = Math.floor(index / grid.columns);
  const result: number[] = [];
  if (row > 0) result.push(index - grid.columns);
  if (column > 0) result.push(index - 1);
  if (column + 1 < grid.columns) result.push(index + 1);
  if (row + 1 < grid.rows) result.push(index + grid.columns);
  return result;
}

interface NavigationNeighbor {
  index: number;
  cost: number;
}

function navigationNeighbors(grid: NavigationGrid, index: number): NavigationNeighbor[] {
  const column = index % grid.columns;
  const row = Math.floor(index / grid.columns);
  const result = neighbors(grid, index).map((neighbor) => ({ index: neighbor, cost: 1 }));
  const diagonals = [
    { columnOffset: -1, rowOffset: -1 },
    { columnOffset: 1, rowOffset: -1 },
    { columnOffset: -1, rowOffset: 1 },
    { columnOffset: 1, rowOffset: 1 },
  ];

  for (const diagonal of diagonals) {
    const nextColumn = column + diagonal.columnOffset;
    const nextRow = row + diagonal.rowOffset;
    if (nextColumn < 0 || nextColumn >= grid.columns || nextRow < 0 || nextRow >= grid.rows) {
      continue;
    }

    const horizontalIndex = row * grid.columns + nextColumn;
    const verticalIndex = nextRow * grid.columns + column;
    const diagonalIndex = nextRow * grid.columns + nextColumn;
    if (grid.blocked[horizontalIndex] || grid.blocked[verticalIndex]) continue;
    result.push({ index: diagonalIndex, cost: Math.SQRT2 });
  }

  return result;
}

interface QueueEntry {
  index: number;
  distance: number;
}

function pushQueue(queue: QueueEntry[], entry: QueueEntry): void {
  queue.push(entry);
  let child = queue.length - 1;
  while (child > 0) {
    const parent = Math.floor((child - 1) / 2);
    if (queue[parent].distance <= queue[child].distance) break;
    [queue[parent], queue[child]] = [queue[child], queue[parent]];
    child = parent;
  }
}

function popQueue(queue: QueueEntry[]): QueueEntry | undefined {
  const first = queue[0];
  const last = queue.pop();
  if (!first || !last || queue.length === 0) return first;

  queue[0] = last;
  let parent = 0;
  while (true) {
    const left = parent * 2 + 1;
    const right = left + 1;
    let smallest = parent;
    if (left < queue.length && queue[left].distance < queue[smallest].distance) smallest = left;
    if (right < queue.length && queue[right].distance < queue[smallest].distance) smallest = right;
    if (smallest === parent) break;
    [queue[parent], queue[smallest]] = [queue[smallest], queue[parent]];
    parent = smallest;
  }
  return first;
}

export function createNavigationGrid(
  width: number,
  height: number,
  cellSize: number,
  clearance: number,
  obstacles: readonly RectangleObstacle[],
): NavigationGrid {
  const safeWidth = Math.max(1, width);
  const safeHeight = Math.max(1, height);
  const safeCellSize = Math.max(1, cellSize);
  const safeClearance = Math.max(0, clearance);
  const columns = Math.max(1, Math.ceil(safeWidth / safeCellSize));
  const rows = Math.max(1, Math.ceil(safeHeight / safeCellSize));
  const grid: NavigationGrid = {
    width: safeWidth,
    height: safeHeight,
    cellSize: safeCellSize,
    columns,
    rows,
    blocked: [],
  };
  const blocked = Array.from({ length: columns * rows }, (_, index) => {
    const center = cellCenter(grid, index);
    const outsideClearance = center.x < safeClearance
      || center.y < safeClearance
      || center.x > safeWidth - safeClearance
      || center.y > safeHeight - safeClearance;
    return outsideClearance || obstacles.some((obstacle) => (
      circleIntersectsRectangle(center, safeClearance, obstacle)
    ));
  });

  return { ...grid, blocked };
}

function nearestWalkableIndex(
  grid: NavigationGrid,
  requestedIndex: number,
  requestedPosition: Position,
): number {
  if (!grid.blocked[requestedIndex]) return requestedIndex;

  const visited = new Set<number>([requestedIndex]);
  let frontier = [requestedIndex];

  while (frontier.length > 0) {
    const nextFrontier: number[] = [];
    const walkable: number[] = [];

    for (const index of frontier) {
      for (const neighbor of neighbors(grid, index)) {
        if (visited.has(neighbor)) continue;
        visited.add(neighbor);
        if (grid.blocked[neighbor]) {
          nextFrontier.push(neighbor);
        } else {
          walkable.push(neighbor);
        }
      }
    }

    if (walkable.length > 0) {
      return walkable.sort((left, right) => {
        const leftCenter = cellCenter(grid, left);
        const rightCenter = cellCenter(grid, right);
        const leftDistance = Math.hypot(
          leftCenter.x - requestedPosition.x,
          leftCenter.y - requestedPosition.y,
        );
        const rightDistance = Math.hypot(
          rightCenter.x - requestedPosition.x,
          rightCenter.y - requestedPosition.y,
        );
        return leftDistance - rightDistance || left - right;
      })[0];
    }

    frontier = nextFrontier;
  }

  return -1;
}

export function createNavigationFlowField(
  grid: NavigationGrid,
  target: Position,
): NavigationFlowField {
  const requestedTarget = cellIndexAt(grid, target);
  const targetIndex = nearestWalkableIndex(grid, requestedTarget, target);
  const distances = Array<number>(grid.blocked.length).fill(Number.POSITIVE_INFINITY);

  if (targetIndex < 0) return {
    distances: distances.map(() => -1),
    targetIndex,
  };

  distances[targetIndex] = 0;
  const queue: QueueEntry[] = [];
  pushQueue(queue, { index: targetIndex, distance: 0 });

  while (queue.length > 0) {
    const current = popQueue(queue);
    if (!current || current.distance > distances[current.index]) continue;

    for (const neighbor of navigationNeighbors(grid, current.index)) {
      if (grid.blocked[neighbor.index]) continue;
      const distance = current.distance + neighbor.cost;
      if (distance >= distances[neighbor.index]) continue;
      distances[neighbor.index] = distance;
      pushQueue(queue, { index: neighbor.index, distance });
    }
  }

  return {
    distances: distances.map((distance) => Number.isFinite(distance) ? distance : -1),
    targetIndex,
  };
}

function nextCellIndex(
  grid: NavigationGrid,
  flow: NavigationFlowField,
  currentIndex: number,
  target: Position,
): number {
  const currentDistance = flow.distances[currentIndex];
  if (currentDistance <= 0) return -1;

  return navigationNeighbors(grid, currentIndex)
    .map((neighbor) => neighbor.index)
    .filter((index) => !grid.blocked[index]
      && flow.distances[index] >= 0
      && flow.distances[index] < currentDistance)
    .sort((left, right) => {
      const distanceDifference = flow.distances[left] - flow.distances[right];
      if (distanceDifference !== 0) return distanceDifference;
      const leftCenter = cellCenter(grid, left);
      const rightCenter = cellCenter(grid, right);
      const leftTargetDistance = Math.hypot(leftCenter.x - target.x, leftCenter.y - target.y);
      const rightTargetDistance = Math.hypot(rightCenter.x - target.x, rightCenter.y - target.y);
      return leftTargetDistance - rightTargetDistance || left - right;
    })[0] ?? -1;
}

function recoveryCellIndex(
  grid: NavigationGrid,
  flow: NavigationFlowField,
  currentIndex: number,
  position: Position,
): number {
  return neighbors(grid, currentIndex)
    .filter((index) => !grid.blocked[index] && flow.distances[index] >= 0)
    .sort((left, right) => {
      const leftCenter = cellCenter(grid, left);
      const rightCenter = cellCenter(grid, right);
      const leftDistance = Math.hypot(leftCenter.x - position.x, leftCenter.y - position.y);
      const rightDistance = Math.hypot(rightCenter.x - position.x, rightCenter.y - position.y);
      return leftDistance - rightDistance
        || flow.distances[left] - flow.distances[right]
        || left - right;
    })[0] ?? -1;
}

function moveTowardByDistance(
  position: Position,
  target: Position,
  distance: number,
): { position: Position; consumed: number } {
  const offsetX = target.x - position.x;
  const offsetY = target.y - position.y;
  const targetDistance = Math.hypot(offsetX, offsetY);

  if (targetDistance <= POSITION_EPSILON) {
    return { position: { ...target }, consumed: 0 };
  }

  const consumed = Math.min(Math.max(0, distance), targetDistance);
  return {
    position: {
      x: position.x + offsetX / targetDistance * consumed,
      y: position.y + offsetY / targetDistance * consumed,
    },
    consumed,
  };
}

export function navigationPathAlongFlow(
  grid: NavigationGrid,
  flow: NavigationFlowField,
  start: Position,
  target: Position,
  maxDistance: number,
): Position[] {
  let position = { ...start };
  let remaining = Math.max(0, maxDistance);
  const path: Position[] = [];

  while (remaining > POSITION_EPSILON) {
    const currentIndex = cellIndexAt(grid, position);
    const currentDistance = flow.distances[currentIndex];
    if (grid.blocked[currentIndex]) {
      const recoveryIndex = recoveryCellIndex(grid, flow, currentIndex, position);
      if (recoveryIndex < 0) break;

      const recovery = moveTowardByDistance(
        position,
        cellCenter(grid, recoveryIndex),
        remaining,
      );
      if (recovery.consumed <= POSITION_EPSILON) break;
      position = recovery.position;
      path.push({ ...position });
      remaining -= recovery.consumed;
      continue;
    }
    if (currentDistance < 0) break;

    const currentCenter = cellCenter(grid, currentIndex);
    let waypoint = target;

    if (currentDistance > 0) {
      const nextIndex = nextCellIndex(grid, flow, currentIndex, target);
      if (nextIndex < 0) break;

      const nextCenter = cellCenter(grid, nextIndex);
      const progressTowardNext = (position.x - currentCenter.x)
        * (nextCenter.x - currentCenter.x)
        + (position.y - currentCenter.y) * (nextCenter.y - currentCenter.y);
      const atCenter = Math.hypot(
        position.x - currentCenter.x,
        position.y - currentCenter.y,
      ) <= POSITION_EPSILON;
      waypoint = atCenter || progressTowardNext > POSITION_EPSILON
        ? nextCenter
        : currentCenter;
    }
    const movement = moveTowardByDistance(position, waypoint, remaining);

    if (movement.consumed <= POSITION_EPSILON) break;
    position = movement.position;
    path.push({ ...position });
    remaining -= movement.consumed;

    if (currentDistance === 0 && Math.hypot(position.x - target.x, position.y - target.y)
      <= POSITION_EPSILON) break;
  }

  return path;
}

export function moveAlongNavigationFlow(
  grid: NavigationGrid,
  flow: NavigationFlowField,
  start: Position,
  target: Position,
  maxDistance: number,
): Position {
  const path = navigationPathAlongFlow(grid, flow, start, target, maxDistance);
  return path[path.length - 1] ?? { ...start };
}
