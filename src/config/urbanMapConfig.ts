import type { RectangleObstacle } from '../logic/obstacleCollision';

export interface UrbanMapObstacle extends RectangleObstacle {
  blocksHitscan: boolean;
}

export const URBAN_MAP_CONFIG = {
  width: 2_400,
  height: 1_600,
  gridSize: 80,
  roads: [
    { x: 0, y: 640, width: 2_400, height: 320 },
    { x: 1_040, y: 0, width: 320, height: 1_600 },
    { x: 120, y: 120, width: 2_160, height: 160 },
    { x: 120, y: 1_320, width: 2_160, height: 160 },
    { x: 120, y: 120, width: 160, height: 1_360 },
    { x: 2_120, y: 120, width: 160, height: 1_360 },
    { x: 600, y: 280, width: 160, height: 360 },
    { x: 1_640, y: 280, width: 160, height: 360 },
    { x: 1_720, y: 960, width: 160, height: 360 },
  ] satisfies readonly RectangleObstacle[],
  pavedAreas: [
    { x: 280, y: 960, width: 760, height: 360 },
  ] satisfies readonly RectangleObstacle[],
  obstacles: [
    {
      x: 320,
      y: 320,
      width: 240,
      height: 280,
      blocksHitscan: true,
    },
    {
      x: 800,
      y: 300,
      width: 200,
      height: 300,
      blocksHitscan: true,
    },
    {
      x: 1_400,
      y: 300,
      width: 200,
      height: 300,
      blocksHitscan: true,
    },
    {
      x: 1_840,
      y: 340,
      width: 240,
      height: 240,
      blocksHitscan: true,
    },
    {
      x: 1_400,
      y: 1_000,
      width: 280,
      height: 240,
      blocksHitscan: true,
    },
    {
      x: 1_920,
      y: 980,
      width: 160,
      height: 300,
      blocksHitscan: true,
    },
  ] satisfies readonly UrbanMapObstacle[],
} as const;
