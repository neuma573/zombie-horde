import { describe, expect, it } from 'vitest';

import { resolveAimDirection } from '../logic/aim';

describe('resolveAimDirection', () => {
  it('normalizes a valid aim direction', () => {
    expect(resolveAimDirection({ x: 3, y: 4 }, { x: 1, y: 0 })).toEqual({ x: 0.6, y: 0.8 });
  });

  it('keeps the last valid direction for a zero-length aim', () => {
    expect(resolveAimDirection({ x: 0, y: 0 }, { x: 0, y: -1 })).toEqual({ x: 0, y: -1 });
  });

  it('keeps the last valid direction when aim is below the hitscan threshold', () => {
    expect(resolveAimDirection({ x: 1e-10, y: 0 }, { x: -1, y: 0 })).toEqual({ x: -1, y: 0 });
  });
});
