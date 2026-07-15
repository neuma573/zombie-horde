import { describe, expect, it } from 'vitest';

import { resolveHitscan } from '../logic/hitscan';
import { DamageSystem } from '../systems/DamageSystem';

describe('DamageSystem', () => {
  it('damages only the target selected by hitscan', () => {
    const damage = new DamageSystem();
    const near = { id: 'near', health: 50 };
    const far = { id: 'far', health: 50 };
    const targets = [near, far];
    const result = resolveHitscan(
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      200,
      [
        { id: far.id, position: { x: 100, y: 0 }, radius: 5 },
        { id: near.id, position: { x: 50, y: 0 }, radius: 5 },
      ],
      1,
    );

    for (const hit of result.hits) {
      const target = targets.find((candidate) => candidate.id === hit.targetId);
      if (target) {
        damage.apply(target, 25);
      }
    }

    expect(near.health).toBe(25);
    expect(far.health).toBe(50);
  });

  it('reports death only once when health reaches zero', () => {
    const damage = new DamageSystem();
    const target = { health: 20 };

    expect(damage.apply(target, 25)).toEqual({ health: 0, died: true });
    expect(damage.apply(target, 25)).toEqual({ health: 0, died: false });
  });

  it('does not heal when given negative damage', () => {
    const damage = new DamageSystem();
    const target = { health: 20 };

    expect(damage.apply(target, -10)).toEqual({ health: 20, died: false });
  });
});
