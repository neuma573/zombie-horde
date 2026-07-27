import type { Position } from './movement';

export interface Size {
  width: number;
  height: number;
}

export interface ViewRectangle extends Size, Position {}

export interface ScreenRectangle extends Size, Position {}

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
  zoom = 1,
): Position {
  const safeZoom = Number.isFinite(zoom) && zoom > 0 ? zoom : 1;
  const viewportWidth = positive(viewport.width);
  const viewportHeight = positive(viewport.height);
  const displayWidth = viewportWidth / safeZoom;
  const displayHeight = viewportHeight / safeZoom;
  const minX = (displayWidth - viewportWidth) / 2;
  const minY = (displayHeight - viewportHeight) / 2;
  const maxX = Math.max(minX, minX + positive(world.width) - displayWidth);
  const maxY = Math.max(minY, minY + positive(world.height) - displayHeight);

  return {
    x: Math.min(maxX, Math.max(minX, player.x - viewportWidth / 2)),
    y: Math.min(maxY, Math.max(minY, player.y - viewportHeight / 2)),
  };
}

export function cameraWorldView(
  scroll: Position,
  viewport: Size,
  zoom: number,
): ViewRectangle {
  const safeZoom = Number.isFinite(zoom) && zoom > 0 ? zoom : 1;
  const viewportWidth = positive(viewport.width);
  const viewportHeight = positive(viewport.height);
  const width = viewportWidth / safeZoom;
  const height = viewportHeight / safeZoom;

  return {
    x: scroll.x + viewportWidth / 2 - width / 2,
    y: scroll.y + viewportHeight / 2 - height / 2,
    width,
    height,
  };
}

export function cameraScreenPoint(
  worldPoint: Position,
  scroll: Position,
  viewport: Size,
  zoom: number,
): Position {
  const safeZoom = Number.isFinite(zoom) && zoom > 0 ? zoom : 1;
  const centerX = positive(viewport.width) / 2;
  const centerY = positive(viewport.height) / 2;

  return {
    x: centerX + (worldPoint.x - scroll.x - centerX) * safeZoom,
    y: centerY + (worldPoint.y - scroll.y - centerY) * safeZoom,
  };
}

export function cameraWorldPoint(
  screenPoint: Position,
  scroll: Position,
  viewport: Size,
  zoom: number,
): Position {
  const safeZoom = Number.isFinite(zoom) && zoom > 0 ? zoom : 1;
  const centerX = positive(viewport.width) / 2;
  const centerY = positive(viewport.height) / 2;

  return {
    x: scroll.x + centerX + (screenPoint.x - centerX) / safeZoom,
    y: scroll.y + centerY + (screenPoint.y - centerY) / safeZoom,
  };
}

export function clientPointToViewport(
  clientPoint: Position,
  canvasBounds: ScreenRectangle,
  viewport: Size,
): Position | null {
  if (
    !Number.isFinite(clientPoint.x)
    || !Number.isFinite(clientPoint.y)
    || !Number.isFinite(canvasBounds.x)
    || !Number.isFinite(canvasBounds.y)
    || !Number.isFinite(canvasBounds.width)
    || !Number.isFinite(canvasBounds.height)
    || canvasBounds.width <= 0
    || canvasBounds.height <= 0
  ) {
    return null;
  }

  return {
    x: (clientPoint.x - canvasBounds.x)
      * positive(viewport.width) / canvasBounds.width,
    y: (clientPoint.y - canvasBounds.y)
      * positive(viewport.height) / canvasBounds.height,
  };
}
