/** A stable detail scale for site selection, independent of the player's current zoom. */
export const EXPLORATION_MAP_SELECTION_ZOOM = 1.25;

/** Short screens use pages instead of shrinking the planning controls. */
export function usesExplorationPages(width: number, height: number): boolean {
  const portrait = height > width;
  return Math.min(width / (portrait ? 360 : 800), height / (portrait ? 740 : 500)) < 0.85;
}

export function getPlanningPageLayout(width: number, height: number) {
  // Bottom navigation needs a 40px header, 48px budget, 149px plan and 48px tab row.
  const sideTabs = height < 40 + 48 + 149 + 48;
  const body = sideTabs
    ? { x: 124, y: 12, width: width - 136, height: height - 24 }
    : { x: 12, y: 40, width: width - 24, height: height - 88 };
  return {
    sideTabs,
    body,
    budget: { ...body, height: 44 },
    planY: body.y + 48,
    compactPlan: body.height < 48 + 149,
    planHeight: body.height < 48 + 149 ? 114 : 149,
    tabs: [0, 1, 2].map(index => ({
      x: sideTabs ? 12 : 12 + index * (width - 18) / 3,
      y: sideTabs ? 60 + index * 40 : height - 40,
      width: sideTabs ? 100 : (width - 36) / 3,
      height: 36,
    })),
  };
}

export function getExplorationMapZoom(width: number, height: number, contentWidth: number, contentHeight: number): number {
  // Keep the 86px building targets at least 44px across on first entry.
  // This is only the initial zoom: players can still zoom out to the full map.
  return Math.max(44 / 86, width / contentWidth, height / contentHeight) * 1.15;
}

export function paginateDiaryLines(lines: readonly string[], height: number, lineHeight: number): string[] {
  const count = Math.max(1, Math.floor(height / lineHeight));
  const pages: string[] = [];
  for (let start = 0; start < lines.length; start += count) pages.push(lines.slice(start, start + count).join('\n'));
  return pages.length ? pages : [''];
}

export function getCompactResultLayout(width: number, height: number) {
  const side = height < 280 && width >= 450;
  return {
    summary: { x: 12, y: 40, width: side ? width * 0.48 - 24 : width - 24 },
    table: { x: side ? width * 0.48 : 12, y: side ? 36 : 112, width: side ? width * 0.52 - 12 : width - 24 },
    button: { x: 12, y: height - 40, width: width - 24, height: 36 },
  };
}
