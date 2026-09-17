/** Short screens use pages instead of shrinking the planning controls. */
export function usesExplorationPages(width: number, height: number): boolean {
  const portrait = height > width;
  return Math.min(width / (portrait ? 360 : 800), height / (portrait ? 740 : 500)) < 0.85;
}

export function getExplorationMapZoom(width: number, height: number, contentWidth: number, contentHeight: number): number {
  // Keep the 86px building targets at least 44px across on first entry.
  // This is only the initial zoom: players can still zoom out to the full map.
  return Math.max(44 / 86, width / contentWidth, height / contentHeight);
}
