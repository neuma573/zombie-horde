/** Shared by scale selection and rendering so compact height always implies side controls. */
export function usesArmorySideControls(boardWidth: number, boardHeight: number): boolean {
  return boardWidth > boardHeight * 1.5 && boardHeight < 560;
}

export function getArmoryUiScale(width: number, height: number): number {
  const compactScale = Math.min(1, width / 360, height / 360);
  const boardWidth = Math.min(height > width ? 580 : 1160, width / compactScale - 32);
  const boardHeight = Math.min(820, height / compactScale - 64);
  // Near-square screens need the full vertical layout budget, even if width >= height.
  return usesArmorySideControls(boardWidth, boardHeight)
    ? compactScale
    : Math.min(1, width / 360, height / 600);
}

/** Supported viewports reflow at native size; smaller windows retain the fitting fallback. */
export function getArmoryViewportScale(width: number, height: number): number {
  return width >= 320 && height >= 360 ? 1 : getArmoryUiScale(width, height);
}

export function getArmoryControlsLayout(width: number, height: number) {
  const side = usesArmorySideControls(width, height);
  const compact = !side && height < 500;
  const slotHeight = side ? Math.min(88, (height - 172) / 2) : compact ? 44 : width < 600 ? 106 : 126;
  const controlsWidth = side ? 210 : width - 40;
  const controlsX = side ? width - 20 - controlsWidth : 20;
  const buttonY = height - 60;
  const slotY = side ? 88 : buttonY - 14 - slotHeight;
  return {
    side, compact, slotHeight, controlsWidth, controlsX, buttonY, slotY,
    viewport: {
      x: 20, y: 88,
      width: side ? controlsX - 36 : width - 40,
      height: side ? height - 108 : slotY - 104,
    },
  };
}
