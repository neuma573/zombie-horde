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
