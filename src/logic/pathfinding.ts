import type { MovementBounds, Position } from './movement';
import type { RectangleObstacle } from './obstacleCollision';

export interface GridCell {
  column: number;
  row: number;
}

export interface PathfindingGrid {
  cellSize: number;
  clearance: number;
  columns: number;
  rows: number;
  width: number;
  height: number;
  blocked: Uint8Array;
}

export interface CreatePathfindingGridOptions {
  cellSize: number;
  clearance: number;
}

export interface FindPathOptions {
  allowDiagonal: boolean;
}

interface OpenNode {
  index: number;
  f: number;
  h: number;
  sequence: number;
}

const EPSILON = 1e-7;
const ORTHOGONAL_COST = 10;
const DIAGONAL_COST = 14;
const CARDINAL_DIRECTIONS = [
  { column: 0, row: -1, cost: ORTHOGONAL_COST },
  { column: -1, row: 0, cost: ORTHOGONAL_COST },
  { column: 1, row: 0, cost: ORTHOGONAL_COST },
  { column: 0, row: 1, cost: ORTHOGONAL_COST },
] as const;
const DIAGONAL_DIRECTIONS = [
  { column: -1, row: -1, cost: DIAGONAL_COST },
  { column: 1, row: -1, cost: DIAGONAL_COST },
  { column: -1, row: 1, cost: DIAGONAL_COST },
  { column: 1, row: 1, cost: DIAGONAL_COST },
] as const;

function safePositive(value: number, fallback: number): number {
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

function cellIndex(grid: PathfindingGrid, cell: GridCell): number {
  return cell.row * grid.columns + cell.column;
}

function cellFromIndex(grid: PathfindingGrid, index: number): GridCell {
  return {
    column: index % grid.columns,
    row: Math.floor(index / grid.columns),
  };
}

function cellsEqual(first: GridCell, second: GridCell): boolean {
  return first.column === second.column && first.row === second.row;
}

function overlaps(
  left: number,
  top: number,
  right: number,
  bottom: number,
  obstacle: RectangleObstacle,
  clearance: number,
): boolean {
  const obstacleLeft = obstacle.x - clearance;
  const obstacleTop = obstacle.y - clearance;
  const obstacleRight = obstacle.x + Math.max(0, obstacle.width) + clearance;
  const obstacleBottom = obstacle.y + Math.max(0, obstacle.height) + clearance;
  return right > obstacleLeft + EPSILON
    && left < obstacleRight - EPSILON
    && bottom > obstacleTop + EPSILON
    && top < obstacleBottom - EPSILON;
}

export function createPathfindingGrid(
  bounds: Omit<MovementBounds, 'padding'>,
  obstacles: readonly RectangleObstacle[],
  options: CreatePathfindingGridOptions,
): PathfindingGrid {
  const cellSize = safePositive(options.cellSize, 1);
  const width = Math.max(0, Number.isFinite(bounds.width) ? bounds.width : 0);
  const height = Math.max(0, Number.isFinite(bounds.height) ? bounds.height : 0);
  const columns = Math.max(1, Math.ceil(width / cellSize));
  const rows = Math.max(1, Math.ceil(height / cellSize));
  const blocked = new Uint8Array(columns * rows);
  const clearance = Number.isFinite(options.clearance)
    ? Math.max(0, options.clearance)
    : 0;

  for (let row = 0; row < rows; row += 1) {
    for (let column = 0; column < columns; column += 1) {
      const left = column * cellSize;
      const top = row * cellSize;
      const right = Math.min(width, left + cellSize);
      const bottom = Math.min(height, top + cellSize);
      if (obstacles.some((obstacle) => (
        overlaps(left, top, right, bottom, obstacle, clearance)
      ))) {
        blocked[row * columns + column] = 1;
      }
    }
  }

  return { cellSize, clearance, columns, rows, width, height, blocked };
}

export function worldToGridCell(grid: PathfindingGrid, position: Position): GridCell {
  return {
    column: Math.min(
      grid.columns - 1,
      Math.max(0, Math.floor(position.x / grid.cellSize)),
    ),
    row: Math.min(
      grid.rows - 1,
      Math.max(0, Math.floor(position.y / grid.cellSize)),
    ),
  };
}

export function gridCellCenter(grid: PathfindingGrid, cell: GridCell): Position {
  return {
    x: Math.min(
      Math.max(grid.clearance, grid.width - grid.clearance),
      Math.max(grid.clearance, (cell.column + 0.5) * grid.cellSize),
    ),
    y: Math.min(
      Math.max(grid.clearance, grid.height - grid.clearance),
      Math.max(grid.clearance, (cell.row + 0.5) * grid.cellSize),
    ),
  };
}

export function isGridCellWalkable(grid: PathfindingGrid, cell: GridCell): boolean {
  return cell.column >= 0
    && cell.column < grid.columns
    && cell.row >= 0
    && cell.row < grid.rows
    && grid.blocked[cellIndex(grid, cell)] === 0;
}

export function nearestWalkableCell(
  grid: PathfindingGrid,
  origin: GridCell,
): GridCell | null {
  if (isGridCellWalkable(grid, origin)) return origin;

  const maximumRadius = Math.max(grid.columns, grid.rows);
  for (let radius = 1; radius <= maximumRadius; radius += 1) {
    for (let row = origin.row - radius; row <= origin.row + radius; row += 1) {
      for (let column = origin.column - radius; column <= origin.column + radius; column += 1) {
        if (
          Math.max(Math.abs(column - origin.column), Math.abs(row - origin.row)) !== radius
        ) continue;
        const candidate = { column, row };
        if (isGridCellWalkable(grid, candidate)) return candidate;
      }
    }
  }
  return null;
}

function heuristic(first: GridCell, second: GridCell, diagonal: boolean): number {
  const dx = Math.abs(first.column - second.column);
  const dy = Math.abs(first.row - second.row);
  return diagonal
    ? DIAGONAL_COST * Math.min(dx, dy) + ORTHOGONAL_COST * Math.abs(dx - dy)
    : ORTHOGONAL_COST * (dx + dy);
}

function compareOpenNodes(first: OpenNode, second: OpenNode): number {
  return first.f - second.f
    || first.h - second.h
    || first.index - second.index
    || first.sequence - second.sequence;
}

function pushHeap(heap: OpenNode[], node: OpenNode): void {
  heap.push(node);
  let index = heap.length - 1;
  while (index > 0) {
    const parent = Math.floor((index - 1) / 2);
    if (compareOpenNodes(heap[parent], heap[index]) <= 0) break;
    [heap[parent], heap[index]] = [heap[index], heap[parent]];
    index = parent;
  }
}

function popHeap(heap: OpenNode[]): OpenNode | undefined {
  const result = heap[0];
  const last = heap.pop();
  if (!result || heap.length === 0 || !last) return result;
  heap[0] = last;
  let index = 0;
  while (true) {
    const left = index * 2 + 1;
    const right = left + 1;
    let smallest = index;
    if (left < heap.length && compareOpenNodes(heap[left], heap[smallest]) < 0) {
      smallest = left;
    }
    if (right < heap.length && compareOpenNodes(heap[right], heap[smallest]) < 0) {
      smallest = right;
    }
    if (smallest === index) break;
    [heap[index], heap[smallest]] = [heap[smallest], heap[index]];
    index = smallest;
  }
  return result;
}

export function findGridPath(
  grid: PathfindingGrid,
  requestedStart: GridCell,
  requestedGoal: GridCell,
  options: FindPathOptions,
): GridCell[] | null {
  const start = nearestWalkableCell(grid, requestedStart);
  const goal = nearestWalkableCell(grid, requestedGoal);
  if (!start || !goal) return null;
  if (cellsEqual(start, goal)) return [start];

  const size = grid.columns * grid.rows;
  const costs = new Float64Array(size);
  costs.fill(Number.POSITIVE_INFINITY);
  const parents = new Int32Array(size);
  parents.fill(-1);
  const closed = new Uint8Array(size);
  const open: OpenNode[] = [];
  const startIndex = cellIndex(grid, start);
  const goalIndex = cellIndex(grid, goal);
  let sequence = 0;
  costs[startIndex] = 0;
  const startHeuristic = heuristic(start, goal, options.allowDiagonal);
  pushHeap(open, {
    index: startIndex,
    f: startHeuristic,
    h: startHeuristic,
    sequence: sequence++,
  });

  while (open.length > 0) {
    const currentNode = popHeap(open)!;
    if (closed[currentNode.index]) continue;
    if (currentNode.index === goalIndex) {
      const path: GridCell[] = [];
      let index = goalIndex;
      while (index >= 0) {
        path.push(cellFromIndex(grid, index));
        if (index === startIndex) break;
        index = parents[index];
      }
      return path.reverse();
    }

    closed[currentNode.index] = 1;
    const current = cellFromIndex(grid, currentNode.index);
    const directions = options.allowDiagonal
      ? [...CARDINAL_DIRECTIONS, ...DIAGONAL_DIRECTIONS]
      : CARDINAL_DIRECTIONS;

    for (const direction of directions) {
      const next = {
        column: current.column + direction.column,
        row: current.row + direction.row,
      };
      if (!isGridCellWalkable(grid, next)) continue;
      if (direction.column !== 0 && direction.row !== 0 && (
        !isGridCellWalkable(grid, {
          column: current.column + direction.column,
          row: current.row,
        })
        || !isGridCellWalkable(grid, {
          column: current.column,
          row: current.row + direction.row,
        })
      )) continue;

      const nextIndex = cellIndex(grid, next);
      if (closed[nextIndex]) continue;
      const nextCost = costs[currentNode.index] + direction.cost;
      if (nextCost >= costs[nextIndex]) continue;
      costs[nextIndex] = nextCost;
      parents[nextIndex] = currentNode.index;
      const nextHeuristic = heuristic(next, goal, options.allowDiagonal);
      pushHeap(open, {
        index: nextIndex,
        f: nextCost + nextHeuristic,
        h: nextHeuristic,
        sequence: sequence++,
      });
    }
  }

  return null;
}

function segmentIntersectsExpandedObstacle(
  start: Position,
  end: Position,
  obstacle: RectangleObstacle,
  clearance: number,
): boolean {
  const minimumX = obstacle.x - clearance;
  const maximumX = obstacle.x + Math.max(0, obstacle.width) + clearance;
  const minimumY = obstacle.y - clearance;
  const maximumY = obstacle.y + Math.max(0, obstacle.height) + clearance;
  const deltaX = end.x - start.x;
  const deltaY = end.y - start.y;
  let near = 0;
  let far = 1;

  for (const [origin, delta, minimum, maximum] of [
    [start.x, deltaX, minimumX, maximumX],
    [start.y, deltaY, minimumY, maximumY],
  ] as const) {
    if (Math.abs(delta) <= EPSILON) {
      if (origin < minimum - EPSILON || origin > maximum + EPSILON) return false;
      continue;
    }
    const first = (minimum - origin) / delta;
    const second = (maximum - origin) / delta;
    near = Math.max(near, Math.min(first, second));
    far = Math.min(far, Math.max(first, second));
    if (near <= far + EPSILON) continue;
    return false;
  }
  return near <= far + EPSILON;
}

export function hasDirectPath(
  start: Position,
  end: Position,
  obstacles: readonly RectangleObstacle[],
  clearance: number,
): boolean {
  const safeClearance = Number.isFinite(clearance) ? Math.max(0, clearance) : 0;
  return !obstacles.some((obstacle) => (
    segmentIntersectsExpandedObstacle(start, end, obstacle, safeClearance)
  ));
}

function hasPathFromCollisionValidEndpoint(
  endpoint: Position,
  candidate: Position,
  obstacles: readonly RectangleObstacle[],
  clearance: number,
): boolean {
  const safeClearance = Number.isFinite(clearance) ? Math.max(0, clearance) : 0;
  return !obstacles.some((obstacle) => {
    if (!segmentIntersectsExpandedObstacle(endpoint, candidate, obstacle, safeClearance)) {
      return false;
    }
    const startsWithinClearance = endpoint.x >= obstacle.x - safeClearance - EPSILON
      && endpoint.x <= obstacle.x + Math.max(0, obstacle.width) + safeClearance + EPSILON
      && endpoint.y >= obstacle.y - safeClearance - EPSILON
      && endpoint.y <= obstacle.y + Math.max(0, obstacle.height) + safeClearance + EPSILON;
    return !startsWithinClearance
      || segmentIntersectsExpandedObstacle(endpoint, candidate, obstacle, 0);
  });
}

export function hasGridLineOfSight(
  grid: PathfindingGrid,
  start: Position,
  end: Position,
): boolean {
  const distance = Math.hypot(end.x - start.x, end.y - start.y);
  const steps = Math.max(1, Math.ceil(distance / (grid.cellSize * 0.2)));
  let previous = worldToGridCell(grid, start);
  if (!isGridCellWalkable(grid, previous)) return false;

  for (let step = 1; step <= steps; step += 1) {
    const progress = step / steps;
    const current = worldToGridCell(grid, {
      x: start.x + (end.x - start.x) * progress,
      y: start.y + (end.y - start.y) * progress,
    });
    if (!isGridCellWalkable(grid, current)) return false;
    if (
      current.column !== previous.column
      && current.row !== previous.row
      && (
        !isGridCellWalkable(grid, { column: current.column, row: previous.row })
        || !isGridCellWalkable(grid, { column: previous.column, row: current.row })
      )
    ) return false;
    previous = current;
  }
  return true;
}

export function simplifyWorldPath(
  path: readonly Position[],
  grid: PathfindingGrid,
  obstacles: readonly RectangleObstacle[],
  clearance: number,
): Position[] {
  if (path.length <= 2) return path.map((point) => ({ ...point }));
  const simplified: Position[] = [{ ...path[0] }];
  let anchor = 0;

  while (anchor < path.length - 1) {
    let next = path.length - 1;
    while (
      next > anchor + 1
      && (
        !hasDirectPath(path[anchor], path[next], obstacles, clearance)
        || !hasGridLineOfSight(grid, path[anchor], path[next])
      )
    ) {
      next -= 1;
    }
    simplified.push({ ...path[next] });
    anchor = next;
  }
  return simplified;
}

export function findWorldPath(
  grid: PathfindingGrid,
  start: Position,
  goal: Position,
  obstacles: readonly RectangleObstacle[],
  clearance: number,
  options: FindPathOptions,
): Position[] | null {
  const nearestReachableCell = (position: Position): GridCell | null => {
    const origin = worldToGridCell(grid, position);
    const maximumRadius = Math.max(grid.columns, grid.rows);
    for (let radius = 0; radius <= maximumRadius; radius += 1) {
      for (let row = origin.row - radius; row <= origin.row + radius; row += 1) {
        for (
          let column = origin.column - radius;
          column <= origin.column + radius;
          column += 1
        ) {
          if (
            Math.max(Math.abs(column - origin.column), Math.abs(row - origin.row)) !== radius
          ) continue;
          const candidate = { column, row };
          if (
            isGridCellWalkable(grid, candidate)
            && hasPathFromCollisionValidEndpoint(
              position,
              gridCellCenter(grid, candidate),
              obstacles,
              clearance,
            )
          ) return candidate;
        }
      }
    }
    return null;
  };
  const startCell = nearestReachableCell(start);
  const goalCell = nearestReachableCell(goal);
  if (!startCell || !goalCell) return null;
  const cells = findGridPath(
    grid,
    startCell,
    goalCell,
    options,
  );
  if (!cells) return null;
  const points = [
    gridCellCenter(grid, cells[0]),
    ...cells.slice(1).map((cell) => gridCellCenter(grid, cell)),
  ];
  const simplified = simplifyWorldPath(points, grid, obstacles, clearance);
  return simplified.slice(1);
}
