/** Keep a usable logical height for the fixed controls even on short landscape screens. */
export function getArmoryUiScale(width: number, height: number): number {
  const portrait = height > width;
  return Math.min(1, width / 360, height / (portrait ? 600 : 360));
}
