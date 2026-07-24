import { describe, expect, it } from 'vitest';

import { MVP_CONFIG } from '../config/mvpConfig';
import { URBAN_MAP_CONFIG } from '../config/urbanMapConfig';

function circleIntersectsRectangle(
  circle: { x: number; y: number; radius: number },
  rectangle: { x: number; y: number; width: number; height: number },
): boolean {
  const closestX = Math.max(rectangle.x, Math.min(circle.x, rectangle.x + rectangle.width));
  const closestY = Math.max(rectangle.y, Math.min(circle.y, rectangle.y + rectangle.height));
  return Math.hypot(circle.x - closestX, circle.y - closestY) < circle.radius;
}

function rectanglesOverlap(
  first: { x: number; y: number; width: number; height: number },
  second: { x: number; y: number; width: number; height: number },
): boolean {
  return first.x < second.x + second.width
    && first.x + first.width > second.x
    && first.y < second.y + second.height
    && first.y + first.height > second.y;
}

describe('urban map layout', () => {
  it('keeps every fixed obstacle inside the authored map', () => {
    for (const obstacle of URBAN_MAP_CONFIG.obstacles) {
      expect(obstacle.x).toBeGreaterThanOrEqual(0);
      expect(obstacle.y).toBeGreaterThanOrEqual(0);
      expect(obstacle.x + obstacle.width).toBeLessThanOrEqual(URBAN_MAP_CONFIG.width);
      expect(obstacle.y + obstacle.height).toBeLessThanOrEqual(URBAN_MAP_CONFIG.height);
    }
  });

  it('keeps the player spawn clear of every building block', () => {
    const player = {
      ...MVP_CONFIG.player.spawn,
      radius: MVP_CONFIG.player.radius,
    };

    expect(URBAN_MAP_CONFIG.obstacles.every((obstacle) => (
      !circleIntersectsRectangle(player, obstacle)
    ))).toBe(true);
  });

  it('leaves wide horizontal and vertical routes through the center', () => {
    const [horizontalRoad, verticalRoad] = URBAN_MAP_CONFIG.roads;
    const minimumRouteWidth = MVP_CONFIG.zombie.radius * 4;

    expect(horizontalRoad.height).toBeGreaterThanOrEqual(minimumRouteWidth);
    expect(verticalRoad.width).toBeGreaterThanOrEqual(minimumRouteWidth);
    expect(horizontalRoad.height).toBe(verticalRoad.width);
    expect(MVP_CONFIG.player.spawn.y).toBeGreaterThan(horizontalRoad.y);
    expect(MVP_CONFIG.player.spawn.y).toBeLessThan(horizontalRoad.y + horizontalRoad.height);
    expect(MVP_CONFIG.player.spawn.x).toBeGreaterThan(verticalRoad.x);
    expect(MVP_CONFIG.player.spawn.x).toBeLessThan(verticalRoad.x + verticalRoad.width);
  });

  it('keeps an obstacle-free perimeter for edge spawning', () => {
    const minimumClearance = MVP_CONFIG.zombie.radius * 2;

    for (const obstacle of URBAN_MAP_CONFIG.obstacles) {
      expect(obstacle.x).toBeGreaterThanOrEqual(minimumClearance);
      expect(obstacle.y).toBeGreaterThanOrEqual(minimumClearance);
      expect(URBAN_MAP_CONFIG.width - obstacle.x - obstacle.width)
        .toBeGreaterThanOrEqual(minimumClearance);
      expect(URBAN_MAP_CONFIG.height - obstacle.y - obstacle.height)
        .toBeGreaterThanOrEqual(minimumClearance);
    }
  });

  it('provides an outer loop and an open parking area instead of four solid quadrants', () => {
    expect(URBAN_MAP_CONFIG.roads).toHaveLength(9);
    expect(URBAN_MAP_CONFIG.obstacles).toHaveLength(6);
    expect(URBAN_MAP_CONFIG.pavedAreas).toEqual([
      { x: 280, y: 960, width: 760, height: 360 },
    ]);

    const parkingArea = URBAN_MAP_CONFIG.pavedAreas[0];
    expect(URBAN_MAP_CONFIG.obstacles.every((obstacle) => (
      !rectanglesOverlap(obstacle, parkingArea)
    ))).toBe(true);
  });

  it('keeps every authored road clear of building collision geometry', () => {
    for (const road of URBAN_MAP_CONFIG.roads) {
      expect(URBAN_MAP_CONFIG.obstacles.every((obstacle) => (
        !rectanglesOverlap(obstacle, road)
      ))).toBe(true);
    }
  });
});
