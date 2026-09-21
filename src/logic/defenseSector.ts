import type { Vector2 } from './hitscan';
import type { RectangleObstacle } from './obstacleCollision';
import type { DefenseSectorPhase } from '../types/lastStandCombat';

export function defenseSectorPhase(integrity: number, dangerThreshold: number): DefenseSectorPhase {
  return integrity <= 0 ? 'BREACHED' : integrity < dangerThreshold ? 'DANGER' : 'ACTIVE';
}

export function constrainToArea(position: Vector2, area: RectangleObstacle, radius = 0): Vector2 {
  const insetX = Math.min(radius, area.width / 2);
  const insetY = Math.min(radius, area.height / 2);
  return {
    x: Math.max(area.x + insetX, Math.min(area.x + area.width - insetX, position.x)),
    y: Math.max(area.y + insetY, Math.min(area.y + area.height - insetY, position.y)),
  };
}

/** Fraction at which a movement segment first enters a sector's interior gateway. */
export function segmentAreaEntry(start: Vector2, end: Vector2, area: RectangleObstacle): number | null {
  let enter = 0;
  let exit = 1;
  for (const [origin, target, min, max] of [
    [start.x, end.x, area.x, area.x + area.width],
    [start.y, end.y, area.y, area.y + area.height],
  ]) {
    const delta = target - origin;
    if (delta === 0) {
      if (origin < min || origin > max) return null;
      continue;
    }
    const a = (min - origin) / delta;
    const b = (max - origin) / delta;
    enter = Math.max(enter, Math.min(a, b));
    exit = Math.min(exit, Math.max(a, b));
    if (enter > exit) return null;
  }
  return enter;
}
