import type { Vector2 } from './hitscan';
import type { Position } from './movement';

export interface FogOfWarConfig {
  nearbyVisionRadius: number;
  viewDistance: number;
  viewHalfAngleRadians: number;
}

export function isPositionVisible(
  player: Position,
  aimDirection: Vector2,
  position: Position,
  config: FogOfWarConfig,
): boolean {
  const offsetX = position.x - player.x;
  const offsetY = position.y - player.y;
  const distance = Math.hypot(offsetX, offsetY);
  const nearbyRadius = Math.max(0, config.nearbyVisionRadius);

  if (distance <= nearbyRadius) return true;

  const viewDistance = Math.max(nearbyRadius, config.viewDistance);
  const aimLength = Math.hypot(aimDirection.x, aimDirection.y);

  if (distance > viewDistance || distance === 0 || aimLength === 0) return false;

  const dot = (offsetX * aimDirection.x + offsetY * aimDirection.y) / (distance * aimLength);
  const halfAngle = Math.min(Math.PI, Math.max(0, config.viewHalfAngleRadians));

  return Math.max(-1, Math.min(1, dot)) >= Math.cos(halfAngle);
}
