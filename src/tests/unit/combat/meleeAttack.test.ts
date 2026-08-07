import { describe, expect, it } from 'vitest';

import { SHOVE_CONFIG } from '../../../config/meleeConfig';
import {
  advanceShoveWindup,
  createStaminaState,
  recoverStamina,
  resolveShove,
  resolveShoveTargets,
  startShoveWindup,
} from '../../../logic/meleeAttack';

describe('shove stamina', () => {
  it('recovers by elapsed time without exceeding the maximum', () => {
    const singleStep = recoverStamina({ current: 10 }, 2_000, SHOVE_CONFIG);
    const firstSplit = recoverStamina({ current: 10 }, 500, SHOVE_CONFIG);
    const splitSteps = recoverStamina(firstSplit, 1_500, SHOVE_CONFIG);

    expect(splitSteps.current).toBeCloseTo(singleStep.current);
    expect(recoverStamina({ current: 99 }, 2_000, SHOVE_CONFIG).current)
      .toBe(SHOVE_CONFIG.staminaMax);
  });

  it('ignores invalid elapsed time', () => {
    const state = { current: 20 };

    expect(recoverStamina(state, 0, SHOVE_CONFIG)).toBe(state);
    expect(recoverStamina(state, -10, SHOVE_CONFIG)).toBe(state);
    expect(recoverStamina(state, Number.NaN, SHOVE_CONFIG)).toBe(state);
  });
});

describe('shove wind-up', () => {
  it('does not replace an attack that is already winding up', () => {
    const first = startShoveWindup(null);
    const repeated = startShoveWindup(first.state);

    expect(first).toEqual({ started: true, state: { elapsedMs: 0 } });
    expect(repeated).toEqual({ started: false, state: first.state });
  });

  it('impacts only after post-input simulation time reaches the delay', () => {
    const started = startShoveWindup(null).state;
    const beforeImpact = advanceShoveWindup(started, 69, 70);
    const impact = advanceShoveWindup(beforeImpact.state!, 1, 70);

    expect(beforeImpact).toEqual({ impacted: false, state: { elapsedMs: 69 } });
    expect(impact).toEqual({ impacted: true, state: null });
  });
});

describe('shove attack', () => {
  const targets = [
    { id: 'front', position: { x: 50, y: 0 }, radius: 18 },
    { id: 'edge', position: { x: 30, y: 70 }, radius: 18 },
    { id: 'behind', position: { x: -20, y: 0 }, radius: 18 },
    { id: 'far', position: { x: 200, y: 0 }, radius: 18 },
  ];

  it('spends stamina and pushes only zombies in the aimed melee arc', () => {
    const result = resolveShove(
      createStaminaState(SHOVE_CONFIG.staminaMax),
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      targets,
      SHOVE_CONFIG,
    );

    expect(result.performed).toBe(true);
    expect(result.stamina.current).toBe(
      SHOVE_CONFIG.staminaMax - SHOVE_CONFIG.staminaCost,
    );
    expect(result.pushedTargets.map((target) => target.id)).toEqual(['front']);
    expect(result.pushedTargets[0].desiredPosition.x).toBe(104);
    expect(result.pushedTargets[0].desiredPosition.y).toBe(0);
  });

  it('does not spend stamina or push when stamina is insufficient', () => {
    const stamina = { current: SHOVE_CONFIG.staminaCost - 1 };
    const result = resolveShove(
      stamina,
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      targets,
      SHOVE_CONFIG,
    );

    expect(result).toEqual({ performed: false, stamina, pushedTargets: [] });
  });

  it('selects targets from their positions at the contact moment', () => {
    const beforeContact = resolveShoveTargets(
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      [{ id: 'moving', position: { x: 50, y: 0 }, radius: 18 }],
      SHOVE_CONFIG,
    );
    const atContact = resolveShoveTargets(
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      [{ id: 'moving', position: { x: -20, y: 0 }, radius: 18 }],
      SHOVE_CONFIG,
    );

    expect(beforeContact.map((target) => target.id)).toEqual(['moving']);
    expect(atContact).toEqual([]);
  });
});
