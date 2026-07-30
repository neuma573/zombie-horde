import { describe, expect, it } from 'vitest';
import { constrainTooltipWidths } from '../../../logic/hud';

describe('constrainTooltipWidths', () => {
  it('fits the panel and text wrapping inside a narrow viewport', () => {
    const widths = constrainTooltipWidths(240);

    expect(widths).toEqual({
      panelMaxWidth: 224,
      textWrapWidth: 192,
    });
  });

  it('preserves the preferred text width when the viewport has room', () => {
    const widths = constrainTooltipWidths(360);

    expect(widths).toEqual({
      panelMaxWidth: 344,
      textWrapWidth: 260,
    });
  });

  it('subtracts horizontal safe-area insets from a narrow viewport', () => {
    const widths = constrainTooltipWidths(
      240,
      { left: 30, right: 20 },
    );

    expect(widths).toEqual({
      panelMaxWidth: 174,
      textWrapWidth: 142,
    });
  });
});