import type { Position } from './movement';

export interface Size {
  width: number;
  height: number;
}

function positive(value: number): number {
  return Number.isFinite(value) ? Math.max(0, value) : 0;
}

export function createWorldSize(baseMap: Size, viewport: Size): Size {
  return {
    width: Math.max(positive(baseMap.width), positive(viewport.width)),
    height: Math.max(positive(baseMap.height), positive(viewport.height)),
  };
}

export function cameraScrollForPlayer(
  player: Position,
  world: Size,
  viewport: Size,
): Position {
  const viewportWidth = positive(viewport.width);
  const viewportHeight = positive(viewport.height);
  const maxX = Math.max(0, positive(world.width) - viewportWidth);
  const maxY = Math.max(0, positive(world.height) - viewportHeight);

  return {
    x: Math.min(maxX, Math.max(0, player.x - viewportWidth / 2)),
    y: Math.min(maxY, Math.max(0, player.y - viewportHeight / 2)),
  };
}
