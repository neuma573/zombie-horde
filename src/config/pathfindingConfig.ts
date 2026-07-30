export interface PathfindingConfig {
  cellSize: number;
  obstacleClearance: number;
  allowDiagonal: boolean;
  waypointReachDistance: number;
  replanIntervalMs: number;
  maximumPathDeviation: number;
}

export const PATHFINDING_CONFIG = {
  cellSize: 64,
  obstacleClearance: 4,
  allowDiagonal: true,
  waypointReachDistance: 18,
  replanIntervalMs: 500,
  maximumPathDeviation: 96,
} as const satisfies PathfindingConfig;
