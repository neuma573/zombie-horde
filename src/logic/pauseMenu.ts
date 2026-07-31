export interface PauseButtonLayout {
  width: number;
  height: number;
  safeArea: { top: number; right: number; bottom: number; left: number };
}

export interface RectangleBounds {
  left: number;
  right: number;
  top: number;
  bottom: number;
}

export interface PauseMenuActionLayout {
  titleY: number;
  titleFontSize: number;
  subtitleY: number | null;
  buttonHeight: number;
  buttonFontSize: number;
  actionYs: number[];
}

export function createPauseMenuActionLayout(
  top: number,
  bottom: number,
  actionCount: number,
): PauseMenuActionLayout {
  const safeTop = Math.min(top, bottom);
  const safeBottom = Math.max(top, bottom);
  const availableHeight = safeBottom - safeTop;
  const count = Math.max(1, Math.floor(actionCount));
  const compact = availableHeight < 294;
  const gap = compact
    ? Math.min(8, Math.max(2, availableHeight * 0.03))
    : 16;
  const titleSpace = compact
    ? Math.min(42, availableHeight * 0.22)
    : 84;
  const availableForButtons = Math.max(
    count * 18,
    availableHeight - titleSpace - gap * (count - 1),
  );
  const buttonHeight = Math.min(compact ? 40 : 46, availableForButtons / count);
  const contentHeight = titleSpace
    + buttonHeight * count
    + gap * (count - 1);
  const contentTop = safeTop + Math.max(0, (availableHeight - contentHeight) / 2);
  const firstActionY = contentTop + titleSpace + buttonHeight / 2;

  return {
    titleY: contentTop + titleSpace * (compact ? 0.42 : 0.35),
    titleFontSize: compact ? Math.max(16, Math.min(24, titleSpace * 0.58)) : 36,
    subtitleY: compact ? null : contentTop + titleSpace * 0.72,
    buttonHeight,
    buttonFontSize: compact ? Math.max(10, Math.min(14, buttonHeight * 0.34)) : 16,
    actionYs: Array.from(
      { length: count },
      (_, index) => firstActionY + index * (buttonHeight + gap),
    ),
  };
}

export function clampPauseActionWidth(
  requestedWidth: number,
  left: number,
  right: number,
): number {
  return Math.min(
    Math.max(0, requestedWidth),
    Math.max(0, right - left),
  );
}

export function fitPauseActionFontSize(
  label: string,
  buttonWidth: number,
  requestedFontSize: number,
): number {
  const glyphWidthAtOnePixel = [...label].reduce(
    (width, character) => width + (character === ' ' ? 0.35 : 0.7),
    0,
  );
  if (glyphWidthAtOnePixel === 0) return Math.max(0, requestedFontSize);
  const availableTextWidth = Math.max(0, buttonWidth - 8);
  return Math.min(
    Math.max(0, requestedFontSize),
    availableTextWidth / glyphWidthAtOnePixel,
  );
}

export function pauseButtonBounds(layout: PauseButtonLayout): RectangleBounds {
  const usableLeft = Math.min(
    layout.width,
    Math.max(0, layout.safeArea.left + 12),
  );
  const usableRight = Math.max(
    usableLeft,
    Math.min(layout.width, layout.width - layout.safeArea.right - 12),
  );
  const buttonWidth = Math.min(76, usableRight - usableLeft);
  const centerX = usableRight - buttonWidth / 2;
  const usableTop = Math.min(
    layout.height,
    Math.max(0, layout.safeArea.top + 11),
  );
  const usableBottom = Math.max(
    usableTop,
    Math.min(layout.height, layout.height - layout.safeArea.bottom - 11),
  );
  const buttonHeight = Math.min(38, usableBottom - usableTop);
  const centerY = usableTop + buttonHeight / 2;

  return {
    left: centerX - buttonWidth / 2,
    right: centerX + buttonWidth / 2,
    top: centerY - buttonHeight / 2,
    bottom: centerY + buttonHeight / 2,
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
