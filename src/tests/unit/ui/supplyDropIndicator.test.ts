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
});