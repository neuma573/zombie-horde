import { describe, expect, it } from 'vitest';
import { movingCircleContactWindow } from '../../../logic/contactDamage';

describe('movingCircleContactWindow', () => {
  it('returns only the portion of the frame spent in contact', () => {
    const window = movingCircleContactWindow(
      { start: { x: 0, y: 0 }, end: { x: 0, y: 0 }, radius: 18 },
      { start: { x: 100, y: 0 }, end: { x: 20, y: 0 }, radius: 20 },
      1_000,
    );

    expect(window?.startMs).toBeCloseTo(775);
    expect(window?.endMs).toBe(1_000);
  });
});