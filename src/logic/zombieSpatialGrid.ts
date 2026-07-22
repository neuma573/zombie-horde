import type { Position } from './movement';

export const ZOMBIE_SPATIAL_GRID_CELL_SIZE = 64;
export const ZOMBIE_SPATIAL_GRID_MAX_CANDIDATE_CHECKS = 15_000;
export const ZOMBIE_SPATIAL_GRID_MAX_ENTRIES = 4_096;

export interface ZombieSpatialEntry {
  id: string;
  position: Position;
  radius: number;
}

export interface ZombieCandidatePair {
  firstId: string;
  secondId: string;
}

export type ZombieSpatialQueryError =
  | 'invalid-cell-size'
  | 'invalid-check-budget'
  | 'invalid-entry-limit'
  | 'invalid-id'
  | 'duplicate-id'
  | 'invalid-position'
  | 'entry-limit-exceeded';

export interface ZombieSpatialQueryOptions {
  cellSize?: number;
  maxCandidateChecks?: number;
  maxEntries?: number;
}

export interface ZombieSpatialQueryResult {
  pairs: ZombieCandidatePair[];
  checks: number;
  valid: boolean;
  complete: boolean;
  error?: ZombieSpatialQueryError;
}

export interface SpatialCell {
  x: number;
  y: number;
}

interface NormalizedZombieSpatialEntry extends ZombieSpatialEntry {
  radius: number;
}

interface OccupiedColumn {
  x: number;
  occupants: number[];
}

interface OccupiedRow {
  y: number;
  columns: OccupiedColumn[];
}

interface CandidateHeapNode {
  secondIndex: number;
  occupantListIndex: number;
}

function compareIds(first: string, second: string): number {
  if (first < second) return -1;
  if (first > second) return 1;
  return 0;
}

function invalidResult(error: ZombieSpatialQueryError): ZombieSpatialQueryResult {
  return {
    pairs: [],
    checks: 0,
    valid: false,
    complete: false,
    error,
  };
}

function lowerBound<T>(
  values: readonly T[],
  target: number,
  coordinate: (value: T) => number,
): number {
  let low = 0;
  let high = values.length;

  while (low < high) {
    const middle = Math.floor((low + high) / 2);
    if (coordinate(values[middle]) < target) low = middle + 1;
    else high = middle;
  }

  return low;
}

function compareHeapNodes(first: CandidateHeapNode, second: CandidateHeapNode): number {
  return first.secondIndex - second.secondIndex
    || first.occupantListIndex - second.occupantListIndex;
}

function pushHeap(heap: CandidateHeapNode[], node: CandidateHeapNode): void {
  heap.push(node);
  let index = heap.length - 1;

  while (index > 0) {
    const parentIndex = Math.floor((index - 1) / 2);
    if (compareHeapNodes(heap[parentIndex], node) <= 0) break;
    heap[index] = heap[parentIndex];
    index = parentIndex;
  }

  heap[index] = node;
}

function popHeap(heap: CandidateHeapNode[]): CandidateHeapNode | undefined {
  const first = heap[0];
  const last = heap.pop();

  if (!first || !last || heap.length === 0) return first;

  let index = 0;
  while (true) {
    const leftIndex = index * 2 + 1;
    if (leftIndex >= heap.length) break;
    const rightIndex = leftIndex + 1;
    const childIndex = rightIndex < heap.length
      && compareHeapNodes(heap[rightIndex], heap[leftIndex]) < 0
      ? rightIndex
      : leftIndex;

    if (compareHeapNodes(heap[childIndex], last) >= 0) break;
    heap[index] = heap[childIndex];
    index = childIndex;
  }

  heap[index] = last;
  return first;
}

export function spatialCellForPosition(position: Position, cellSize: number): SpatialCell {
  return {
    x: Math.floor(position.x / cellSize),
    y: Math.floor(position.y / cellSize),
  };
}

export function queryZombieCollisionCandidates(
  entries: readonly ZombieSpatialEntry[],
  options: ZombieSpatialQueryOptions = {},
): ZombieSpatialQueryResult {
  const cellSize = options.cellSize ?? ZOMBIE_SPATIAL_GRID_CELL_SIZE;
  const maxCandidateChecks = options.maxCandidateChecks
    ?? ZOMBIE_SPATIAL_GRID_MAX_CANDIDATE_CHECKS;
  const maxEntries = options.maxEntries ?? ZOMBIE_SPATIAL_GRID_MAX_ENTRIES;

  if (!Number.isFinite(cellSize) || cellSize <= 0) {
    return invalidResult('invalid-cell-size');
  }

  if (
    !Number.isFinite(maxCandidateChecks)
    || !Number.isInteger(maxCandidateChecks)
    || maxCandidateChecks <= 0
  ) {
    return invalidResult('invalid-check-budget');
  }

  if (!Number.isFinite(maxEntries) || !Number.isInteger(maxEntries) || maxEntries <= 0) {
    return invalidResult('invalid-entry-limit');
  }

  if (entries.length > maxEntries) {
    return invalidResult('entry-limit-exceeded');
  }

  const ids = new Set<string>();
  const normalized: NormalizedZombieSpatialEntry[] = [];

  for (const entry of entries) {
    if (entry.id.length === 0) return invalidResult('invalid-id');
    if (ids.has(entry.id)) return invalidResult('duplicate-id');
    if (!Number.isFinite(entry.position.x) || !Number.isFinite(entry.position.y)) {
      return invalidResult('invalid-position');
    }

    ids.add(entry.id);
    normalized.push({
      ...entry,
      position: { ...entry.position },
      radius: Number.isFinite(entry.radius) ? Math.max(0, entry.radius) : 0,
    });
  }

  normalized.sort((first, second) => compareIds(first.id, second.id));

  const rowMap = new Map<number, Map<number, number[]>>();
  let maximumRadius = 0;

  normalized.forEach((entry, index) => {
    maximumRadius = Math.max(maximumRadius, entry.radius);
    const cell = spatialCellForPosition(entry.position, cellSize);
    let columns = rowMap.get(cell.y);
    if (!columns) {
      columns = new Map<number, number[]>();
      rowMap.set(cell.y, columns);
    }
    const occupants = columns.get(cell.x);

    if (occupants) occupants.push(index);
    else columns.set(cell.x, [index]);
  });

  const occupiedRows: OccupiedRow[] = [...rowMap.entries()]
    .map(([y, columns]) => ({
      y,
      columns: [...columns.entries()]
        .map(([x, occupants]) => ({ x, occupants }))
        .sort((first, second) => first.x - second.x),
    }))
    .sort((first, second) => first.y - second.y);

  const pairs: ZombieCandidatePair[] = [];
  let checks = 0;

  for (let firstIndex = 0; firstIndex < normalized.length; firstIndex += 1) {
    const first = normalized[firstIndex];
    const firstCell = spatialCellForPosition(first.position, cellSize);
    const neighborRange = Math.ceil((first.radius + maximumRadius) / cellSize);
    const neighborOccupants: number[][] = [];
    const minimumY = firstCell.y - neighborRange;
    const maximumY = firstCell.y + neighborRange;
    const minimumX = firstCell.x - neighborRange;
    const maximumX = firstCell.x + neighborRange;
    const firstRowIndex = lowerBound(occupiedRows, minimumY, (row) => row.y);

    for (let rowIndex = firstRowIndex; rowIndex < occupiedRows.length; rowIndex += 1) {
      const row = occupiedRows[rowIndex];
      if (row.y > maximumY) break;
      const firstColumnIndex = lowerBound(row.columns, minimumX, (column) => column.x);

      for (
        let columnIndex = firstColumnIndex;
        columnIndex < row.columns.length;
        columnIndex += 1
      ) {
        const column = row.columns[columnIndex];
        if (column.x > maximumX) break;
        neighborOccupants.push(column.occupants);
      }
    }

    const occupantOffsets = neighborOccupants.map((occupants) => (
      lowerBound(occupants, firstIndex + 1, (index) => index)
    ));
    const candidateHeap: CandidateHeapNode[] = [];

    neighborOccupants.forEach((occupants, occupantListIndex) => {
      const secondIndex = occupants[occupantOffsets[occupantListIndex]];
      if (secondIndex !== undefined) {
        pushHeap(candidateHeap, { secondIndex, occupantListIndex });
      }
    });

    while (candidateHeap.length > 0) {
      if (checks >= maxCandidateChecks) {
        return {
          pairs,
          checks,
          valid: true,
          complete: false,
        };
      }

      const candidate = popHeap(candidateHeap)!;
      pairs.push({
        firstId: first.id,
        secondId: normalized[candidate.secondIndex].id,
      });
      checks += 1;
      occupantOffsets[candidate.occupantListIndex] += 1;
      const nextSecondIndex = neighborOccupants[candidate.occupantListIndex][
        occupantOffsets[candidate.occupantListIndex]
      ];
      if (nextSecondIndex !== undefined) {
        pushHeap(candidateHeap, {
          secondIndex: nextSecondIndex,
          occupantListIndex: candidate.occupantListIndex,
        });
      }
    }
  }

  return {
    pairs,
    checks,
    valid: true,
    complete: true,
  };
}
