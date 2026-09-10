import { describe, expect, it } from 'vitest';

import { SIMULATION_CONFIG } from '../../config/simulationConfig';
import { POLICE_BATON_WEAPON } from '../../config/weaponConfig';
import { consumeFixedSteps, createFixedStepState } from '../../logic/fixedStep';
import {
  consumeFireRequest,
  createPlayerInputState,
  requestFire,
} from '../../logic/playerInput';
import type { WeaponDefinition } from '../../logic/weapon';
import { WeaponSystem } from '../../systems/WeaponSystem';

const TIMELINE_TEST_BATON = {
  ...POLICE_BATON_WEAPON,
  config: {
    ...POLICE_BATON_WEAPON.config,
    fireIntervalMs: 75,
  },
} satisfies WeaponDefinition;

function acceptsQueuedAttack(nextFrameDeltaMs: number): boolean {
  const weapon = new WeaponSystem(TIMELINE_TEST_BATON);
  weapon.fire();
  let input = requestFire(createPlayerInputState(), 40);
  let simulationElapsedMs = 0;
  const fixedSteps = consumeFixedSteps(
    createFixedStepState(),
    nextFrameDeltaMs,
    SIMULATION_CONFIG.fixedStepMs,
  );
  let accepted = false;

  for (let step = 0; step < fixedSteps.stepCount; step += 1) {
    weapon.update(SIMULATION_CONFIG.fixedStepMs);
    simulationElapsedMs += SIMULATION_CONFIG.fixedStepMs;
    const fire = consumeFireRequest(input, simulationElapsedMs);
    input = fire.state;
    if (fire.requested) accepted = weapon.fire();
  }

  return accepted;
}

describe('melee input timeline', () => {
  it('keeps cooldown rejection independent of the next render time', () => {
    expect(acceptsQueuedAttack(50)).toBe(false);
    expect(acceptsQueuedAttack(100)).toBe(false);
  });
});
