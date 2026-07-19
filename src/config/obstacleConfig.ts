import type { RectangleObstacle } from '../logic/obstacleCollision';

export interface ObstacleConfig extends RectangleObstacle {
  blocksHitscan: boolean;
}

export const OBSTACLE_CONFIG: readonly ObstacleConfig[] = [
  {
    x: 1_500,
    y: 560,
    width: 180,
    height: 480,
    blocksHitscan: true,
  },
];
