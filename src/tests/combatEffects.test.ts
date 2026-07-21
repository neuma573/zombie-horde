import { describe, expect, it } from 'vitest';

import { constrainMuzzleToShotSegment } from '../logic/combatEffects';

describe('constrainMuzzleToShotSegment', () => {
  it('keeps an unobstructed muzzle at its intended position on the shot ray', () => {
    expect(constrainMuzzleToShotSegment(
      { x: 0, y: 0 },
      { x: 53, y: 0 },
      { x: 600, y: 0 },
    )).toEqual({ x: 53, y: 0 });
  });

  it('keeps the visual muzzle before a close blocker', () => {
    expect(constrainMuzzleToShotSegment(
      { x: 0, y: 0 },
      { x: 53, y: 0 },
      { x: 18, y: 0 },
    )).toEqual({ x: 16, y: 0 });
  });

  it('projects a visual muzzle onto the exact gameplay ray', () => {
    expect(constrainMuzzleToShotSegment(
      { x: 10, y: 20 },
      { x: 63, y: 30 },
      { x: 110, y: 20 },
    )).toEqual({ x: 63, y: 20 });
  });

  it('falls back to the gameplay origin for a zero-length shot', () => {
    expect(constrainMuzzleToShotSegment(
      { x: 10, y: 20 },
      { x: 63, y: 20 },
      { x: 10, y: 20 },
    )).toEqual({ x: 10, y: 20 });
  });
});
