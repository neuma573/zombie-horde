import { describe, expect, it } from 'vitest';
import { positionTooltip } from '../../../logic/hud';

describe('positionTooltip', () => {
  it('places a weapon-slot tooltip below the top bar anchor', () => {
    const position = positionTooltip(
      { x: 180, y: 100 },
      { width: 260, height: 110 },
      { width: 360, height: 640 },
      'below',
    );

    expect(position.x).toBe(180);
    expect(position.y).toBe(173);
    expect(position.y - 55).toBeGreaterThan(100);
  });

  it('keeps a field tooltip above its item and inside the viewport', () => {
    const position = positionTooltip(
      { x: 350, y: 620 },
      { width: 260, height: 110 },
      { width: 360, height: 640 },
      'above',
    );

    expect(position.x).toBe(222);
    expect(position.y).toBe(547);
    expect(position.x + 130).toBeLessThanOrEqual(352);
  });

  it('keeps a field tooltip inside landscape safe-area insets', () => {
    const position = positionTooltip(
      { x: 0, y: 239 },
      { width: 260, height: 110 },
      { width: 360, height: 240 },
      'below',
      { top: 0, right: 0, bottom: 21, left: 44 },
    );

    expect(position).toEqual({ x: 182, y: 156 });
    expect(position.x - 130).toBeGreaterThanOrEqual(52);
    expect(position.y + 55).toBeLessThanOrEqual(211);
  });
});