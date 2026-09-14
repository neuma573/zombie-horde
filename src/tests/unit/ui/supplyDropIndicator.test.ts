import { describe, expect, it } from 'vitest';
import { resolveSupplyDropIndicator } from '../../../logic/supplyDrop';

describe('supply drop indicator', () => {
  it('clamps an off-screen target to the viewport edge', () => {
    expect(resolveSupplyDropIndicator(
      { x: 1_200, y: 300 },
      { width: 800, height: 600 },
      40,
    )).toMatchObject({
      visible: true,
      position: { x: 760, y: 300 },
      rotation: 0,
    });
  });

  it('hides when the target is already inside the safe viewport', () => {
    expect(resolveSupplyDropIndicator(
      { x: 400, y: 300 },
      { width: 800, height: 600 },
      40,
    ).visible).toBe(false);
  });
  it.each([
    { x: 1, y: 300 }, { x: 799, y: 300 },
    { x: 400, y: 1 }, { x: 400, y: 599 },
    { x: 0, y: 0 }, { x: 800, y: 600 },
  ])('hides for visible targets near the screen edge at %j', (position) => {
    expect(resolveSupplyDropIndicator(position, { width: 800, height: 600 }, 40).visible)
      .toBe(false);
  });

  it('hides while part of the target still overlaps the screen', () => {
    expect(resolveSupplyDropIndicator(
      { x: -20, y: 300 }, { width: 800, height: 600 }, 40, { x: 26, y: 21 },
    ).visible).toBe(false);
  });

  it('shows once the entire target leaves the screen', () => {
    expect(resolveSupplyDropIndicator(
      { x: -27, y: 300 }, { width: 800, height: 600 }, 40, { x: 26, y: 21 },
    ).visible).toBe(true);
  });
});