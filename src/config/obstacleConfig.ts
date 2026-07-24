import {
  URBAN_MAP_CONFIG,
  type UrbanMapObstacle,
} from './urbanMapConfig';

export type ObstacleConfig = UrbanMapObstacle;

export const OBSTACLE_CONFIG: readonly ObstacleConfig[] = URBAN_MAP_CONFIG.obstacles;
