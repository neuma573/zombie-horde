import { describe, expect, it } from 'vitest';
import { createSettingsLayout } from '../../../logic/settingsLayout';

describe('settings panel layout', () => {
  it.each([[1280, 800], [390, 844], [320, 568], [844, 390], [568, 320]])(
    'keeps titles and controls separated inside a %i × %i viewport', (width, height) => {
      const layout = createSettingsLayout(width - 48, height - 48);
      expect(layout.width).toBeLessThanOrEqual(width - 48);
      expect(layout.height).toBeLessThanOrEqual(height - 48);
      expect(layout.soundY - layout.buttonHeight / 2).toBeGreaterThan(layout.titleY + 16);
      expect(layout.languageLabelY - 8).toBeGreaterThan(layout.soundY + layout.buttonHeight / 2);
      expect(layout.languageY - layout.buttonHeight / 2).toBeGreaterThan(layout.languageLabelY + 8);
      expect(layout.closeY - layout.buttonHeight / 2).toBeGreaterThan(layout.languageY + layout.buttonHeight / 2);
      expect(layout.closeY + layout.buttonHeight / 2).toBeLessThan(layout.height);
      expect(layout.optionOffset * 2).toBeGreaterThan(layout.optionWidth);
      expect(layout.buttonHeight).toBeGreaterThanOrEqual(40);
    },
  );
});
