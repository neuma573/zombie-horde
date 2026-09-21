import { describe, expect, it } from 'vitest';
import { constrainToArea, defenseSectorPhase } from '../../../logic/defenseSector';

describe('defense sector boundaries', () => {
  it.each([[100, 'ACTIVE'], [10, 'ACTIVE'], [9.999, 'DANGER'], [0, 'BREACHED']] as const)(
    'classifies integrity %s as %s', (integrity, phase) => {
      expect(defenseSectorPhase(integrity, 10)).toBe(phase);
    },
  );
  it('keeps the entire player inside an offset combat area', () => {
    expect(constrainToArea({ x: -100, y: 999 }, { x: 100, y: 200, width: 300, height: 100 }, 20))
      .toEqual({ x: 120, y: 280 });
  });
  it('centers an actor when the area is narrower than its diameter', () => {
    expect(constrainToArea({ x: 0, y: 0 }, { x: 100, y: 200, width: 10, height: 10 }, 20))
      .toEqual({ x: 105, y: 205 });
  });
});
