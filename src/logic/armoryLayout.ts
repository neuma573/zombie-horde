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
export function getArmoryViewportScale(width: number, height: number, hasCompanions = false): number {
  if (hasCompanions) {
    const minimumHeight = width >= 740 && width > height * 1.5 ? 420 : 600;
    return Math.min(1, width / 320, height / minimumHeight);
  }
  return width >= 320 && height >= 360 ? 1 : getArmoryUiScale(width, height);
}

export function getArmoryControlsLayout(width: number, height: number, headerHeight = 88, rosterPlacement: 'top' | 'left' = 'top') {
  const desktop = rosterPlacement === 'left' && width >= 960 && height >= 560 && headerHeight > 88;
  const side = usesArmorySideControls(width, height);
  if (desktop) {
    const slotY = height - 186;
    return {
      desktop, side: false, compact: false, slotHeight: 110,
      controlsWidth: width - 560, controlsX: 280,
      buttonX: width - 260, buttonWidth: 240, buttonY: height - 60, slotY,
      viewport: { x: 280, y: 88, width: width - 300, height: slotY - 104 },
    };
  }
  const compact = !side && height < 500;
  const slotHeight = side ? Math.min(88, (height - headerHeight - (headerHeight > 88 ? 110 : 84)) / 2) : compact ? 44 : width < 600 ? 106 : 126;
  const controlsWidth = side ? 210 : width - 40;
  const controlsX = side ? width - 20 - controlsWidth : 20;
  const buttonY = height - 60;
  const slotY = side ? headerHeight : buttonY - (headerHeight > 88 ? 30 : 14) - slotHeight;
  return {
    desktop, side, compact, slotHeight, controlsWidth, controlsX, buttonY, slotY,
    buttonX: controlsX, buttonWidth: controlsWidth,
    viewport: {
      x: 20, y: headerHeight,
      width: side ? controlsX - 36 : width - 40,
      height: side ? height - headerHeight - 20 : slotY - headerHeight - 16,
    },
  };
}
