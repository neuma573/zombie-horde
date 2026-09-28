import { describe, expect, it } from 'vitest';
import { companionDecision, turnCompanionAim } from '../../../logic/companionBehavior';

describe('companion aim turning', () => {
  it('turns gradually toward a target behind the companion', () => {
    const direction = turnCompanionAim({ x: -1, y: 0 }, { x: 1, y: 0 }, Math.PI / 6);
    expect(direction.x).toBeCloseTo(-Math.sqrt(3) / 2);
    expect(Math.abs(direction.y)).toBeCloseTo(0.5);
    expect(Math.hypot(direction.x, direction.y)).toBeCloseTo(1);
  });

  it('stops turning at the desired direction without overshooting', () => {
    const direction = turnCompanionAim({ x: 1, y: 0 }, { x: 1, y: 1 }, Math.PI);
    expect(direction.x).toBeCloseTo(Math.SQRT1_2);
    expect(direction.y).toBeCloseTo(Math.SQRT1_2);
  });

  it('keeps its facing when the target is at its own position', () => {
    expect(turnCompanionAim({ x: -1, y: 0 }, { x: 0, y: 0 }, Math.PI)).toEqual({ x: -1, y: 0 });
  });
});

describe('companion decisions', () => {
  it('repeats bounded decisions for the same seed and sequence', () => {
    const first = Array.from({ length: 10 }, (_, index) => companionDecision(7, index));
    const replay = Array.from({ length: 10 }, (_, index) => companionDecision(7, index));
    expect(first).toEqual(replay);
    expect(first.every(value => value >= 0 && value < 1)).toBe(true);
    expect(new Set(first).size).toBeGreaterThan(1);
    expect(companionDecision(8, 0)).not.toBe(first[0]);
  });
});
