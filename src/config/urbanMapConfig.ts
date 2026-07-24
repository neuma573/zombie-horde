import type { RectangleObstacle } from '../logic/obstacleCollision';

export type BuildingStyle = 'brick' | 'concrete' | 'industrial';
export type BuildingKind = 'flat' | 'house' | 'storefront';
export type BuildingEntranceSide = 'north' | 'east' | 'south' | 'west';

export interface BuildingVisualConfig {
  kind: BuildingKind;
  style: BuildingStyle;
  entranceSide: BuildingEntranceSide;
  fixtureVariant: 0 | 1 | 2;
}

export interface UrbanMapObstacle extends RectangleObstacle {
  blocksHitscan: boolean;
  visual: BuildingVisualConfig;
}

export interface UrbanRoad extends RectangleObstacle {
  kind: 'main' | 'local';
}

export const URBAN_MAP_CONFIG = {
  width: 4_000,
  height: 3_000,
  gridSize: 80,
  sidewalkWidth: 108,
  roads: [
    { x: 0, y: 1_220, width: 4_000, height: 560, kind: 'main' },
    { x: 1_720, y: 0, width: 560, height: 3_000, kind: 'main' },
    { x: 80, y: 80, width: 3_840, height: 240, kind: 'local' },
    { x: 80, y: 2_680, width: 3_840, height: 240, kind: 'local' },
    { x: 80, y: 80, width: 240, height: 2_840, kind: 'local' },
    { x: 3_680, y: 80, width: 240, height: 2_840, kind: 'local' },
    { x: 900, y: 320, width: 240, height: 900, kind: 'local' },
    { x: 2_860, y: 320, width: 240, height: 900, kind: 'local' },
    { x: 2_940, y: 1_780, width: 240, height: 900, kind: 'local' },
  ] satisfies readonly UrbanRoad[],
  pavedAreas: [
    { x: 320, y: 1_780, width: 1_400, height: 900 },
  ] satisfies readonly RectangleObstacle[],
  parkingSlotSpacing: 112,
  obstacles: [
    {
      x: 474,
      y: 570,
      width: 272,
      height: 400,
      blocksHitscan: true,
      visual: {
        kind: 'house',
        style: 'brick',
        entranceSide: 'east',
        fixtureVariant: 0,
      },
    },
    {
      x: 1_294,
      y: 550,
      width: 232,
      height: 440,
      blocksHitscan: true,
      visual: {
        kind: 'storefront',
        style: 'concrete',
        entranceSide: 'east',
        fixtureVariant: 1,
      },
    },
    {
      x: 2_444,
      y: 550,
      width: 232,
      height: 440,
      blocksHitscan: true,
      visual: {
        kind: 'storefront',
        style: 'industrial',
        entranceSide: 'west',
        fixtureVariant: 2,
      },
    },
    {
      x: 3_254,
      y: 570,
      width: 272,
      height: 400,
      blocksHitscan: true,
      visual: {
        kind: 'house',
        style: 'brick',
        entranceSide: 'east',
        fixtureVariant: 1,
      },
    },
    {
      x: 2_444,
      y: 2_030,
      width: 312,
      height: 400,
      blocksHitscan: true,
      visual: {
        kind: 'flat',
        style: 'concrete',
        entranceSide: 'west',
        fixtureVariant: 0,
      },
    },
    {
      x: 3_334,
      y: 2_025,
      width: 192,
      height: 410,
      blocksHitscan: true,
      visual: {
        kind: 'storefront',
        style: 'industrial',
        entranceSide: 'east',
        fixtureVariant: 2,
      },
    },
  ] satisfies readonly UrbanMapObstacle[],
} as const;
