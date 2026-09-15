export function createSettingsLayout(width: number, height: number) {
  const compact = height < 360;
  const panelWidth = Math.max(0, Math.min(420, width));
  const panelHeight = Math.max(0, Math.min(compact ? 264 : 340, height));
  const scale = Math.min(1, panelHeight / (compact ? 264 : 340));
  const padding = Math.min(24, panelWidth * 0.07);
  const innerWidth = Math.max(0, panelWidth - padding * 2);
  const gap = Math.min(12, innerWidth * 0.05);
  return {
    width: panelWidth,
    height: panelHeight,
    innerWidth,
    optionWidth: Math.max(0, (innerWidth - gap) / 2),
    optionOffset: (innerWidth + gap) / 4,
    buttonHeight: (compact ? 40 : 48) * scale,
    titleY: (compact ? 28 : 36) * scale,
    soundY: (compact ? 76 : 104) * scale,
    languageLabelY: (compact ? 116 : 160) * scale,
    languageY: (compact ? 150 : 200) * scale,
    closeY: (compact ? 222 : 292) * scale,
    fontScale: scale,
  };
}
