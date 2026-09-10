import { describe, expect, it } from 'vitest';

import { SIMULATION_CONFIG } from '../../config/simulationConfig';
import {
  PISTOL_WEAPON,
  POLICE_BATON_WEAPON,
} from '../../config/weaponConfig';
import { consumeFixedSteps, createFixedStepState } from '../../logic/fixedStep';
import type { WeaponDefinition } from '../../logic/weapon';
import { PlayerActionQueue } from '../../systems/PlayerActionQueue';
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
  const actions = new PlayerActionQueue();
  actions.requestFire(40);
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
    const action = actions.consumeThrough(simulationElapsedMs);
    if (action?.action.type === 'fire') accepted = weapon.fire();
  }

  return accepted;
}

function resolveWeaponActions(
  actions: PlayerActionQueue,
  weapon: WeaponSystem,
  simulationBoundaryMs: number,
): WeaponDefinition['id'][] {
  const firedWeaponIds: WeaponDefinition['id'][] = [];
  let queued = actions.consumeThrough(simulationBoundaryMs);

  while (queued) {
    if (queued.action.type === 'fire' && weapon.fire()) {
      firedWeaponIds.push(weapon.getDefinition().id);
    } else if (queued.action.type === 'reload') {
      weapon.reload();
    } else if (queued.action.type === 'selectWeaponSlot') {
      weapon.selectSlot(queued.action.slot);
    }
    queued = actions.consumeThrough(simulationBoundaryMs);
  }

  return firedWeaponIds;
}

describe('melee input timeline', () => {
  it('keeps cooldown rejection independent of the next render time', () => {
    expect(acceptsQueuedAttack(50)).toBe(false);
    expect(acceptsQueuedAttack(100)).toBe(false);
  });

  it('fires the clicked weapon before a later slot switch', () => {
    const weapon = new WeaponSystem(PISTOL_WEAPON);
    weapon.pickup(POLICE_BATON_WEAPON);
    weapon.selectSlot(0);
    const actions = new PlayerActionQueue();
    actions.requestFire(40);
    actions.requestWeaponSlot(1, 45);

    const firedWeaponIds = resolveWeaponActions(actions, weapon, 50);

    expect(firedWeaponIds).toEqual(['pistol']);
    expect(weapon.getDefinition().id).toBe('policeBaton');
  });

  it('fires before a later reload starts', () => {
    const weapon = new WeaponSystem(PISTOL_WEAPON);
    weapon.fire();
    weapon.update(PISTOL_WEAPON.config.fireIntervalMs);
    const actions = new PlayerActionQueue();
    actions.requestFire(40);
    actions.requestReload(45);

    const firedWeaponIds = resolveWeaponActions(actions, weapon, 50);

    expect(firedWeaponIds).toEqual(['pistol']);
    expect(weapon.getState().magazineAmmo).toBe(PISTOL_WEAPON.config.magazineSize - 2);
    expect(weapon.getState().reloadRemainingMs).toBe(PISTOL_WEAPON.config.reloadDurationMs);
  });
});
