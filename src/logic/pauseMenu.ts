export interface PauseButtonLayout {
  width: number;
  safeArea: { top: number; right: number };
}

export interface RectangleBounds {
  left: number;
  right: number;
  top: number;
  bottom: number;
}

export function pauseButtonBounds(layout: PauseButtonLayout): RectangleBounds {
  const centerX = layout.width - layout.safeArea.right - 50;
  const centerY = layout.safeArea.top + 30;

  return {
    left: centerX - 38,
    right: centerX + 38,
    top: centerY - 19,
    bottom: centerY + 19,
  };
}

export function isPointInBounds(
  point: { x: number; y: number },
  bounds: RectangleBounds,
): boolean {
  return point.x >= bounds.left
    && point.x <= bounds.right
    && point.y >= bounds.top
    && point.y <= bounds.bottom;
}
