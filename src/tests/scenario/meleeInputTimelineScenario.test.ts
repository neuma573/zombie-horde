import { describe, expect, it } from 'vitest';

import { SIMULATION_CONFIG } from '../../config/simulationConfig';
import {
  DOUBLE_BARREL_SHOTGUN_WEAPON,
  PISTOL_WEAPON,
  POLICE_BATON_WEAPON,
} from '../../config/weaponConfig';
import { consumeFixedSteps, createFixedStepState } from '../../logic/fixedStep';
import {
  resolveMeleeHits,
  resolveShove,
  type StaminaState,
} from '../../logic/meleeAttack';
import {
  createOwnedWeapon,
  type OwnedWeapon,
  type WeaponDefinition,
} from '../../logic/weapon';
import {
  dispatchPlayerActionsThrough,
  type PlayerActionHandlers,
} from '../../systems/PlayerActionCoordinator';
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
  actions.reset(0, 0);
  actions.requestFire(40, { x: 1, y: 0 });
  actions.advanceFrame(0, nextFrameDeltaMs, nextFrameDeltaMs);
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
    dispatchPlayerActionsThrough(
      actions,
      simulationElapsedMs,
      createWeaponActionHandlers(weapon, [], new Map(), (didFire) => {
        accepted = didFire;
      }),
    );
  }

  return accepted;
}

function createWeaponActionHandlers(
  weapon: WeaponSystem,
  firedWeaponIds: WeaponDefinition['id'][],
  pickups: ReadonlyMap<number, OwnedWeapon> = new Map(),
  onFire: (didFire: boolean) => void = () => {},
): PlayerActionHandlers {
  return {
    fire: () => {
      const weaponId = weapon.getDefinition().id;
      const didFire = weapon.fire();
      if (didFire) firedWeaponIds.push(weaponId);
      onFire(didFire);
    },
    reload: () => weapon.reload(),
    selectWeaponSlot: (slot) => weapon.selectSlot(slot),
    shove: () => {},
    pickupWeapon: (pickupId) => {
      const pickup = pickups.get(pickupId);
      if (pickup) weapon.pickupOwned(pickup);
    },
  };
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
    actions.reset(0, 0);
    actions.requestFire(40, { x: 1, y: 0 });
    actions.requestWeaponSlot(1, 45);
    actions.advanceFrame(0, 50, 50);

    const firedWeaponIds: WeaponDefinition['id'][] = [];
    dispatchPlayerActionsThrough(
      actions,
      50,
      createWeaponActionHandlers(weapon, firedWeaponIds),
    );

    expect(firedWeaponIds).toEqual(['pistol']);
    expect(weapon.getDefinition().id).toBe('policeBaton');
  });

  it('fires before a later reload starts', () => {
    const weapon = new WeaponSystem(PISTOL_WEAPON);
    weapon.fire();
    weapon.update(PISTOL_WEAPON.config.fireIntervalMs);
    const actions = new PlayerActionQueue();
    actions.reset(0, 0);
    actions.requestFire(40, { x: 1, y: 0 });
    actions.requestReload(45);
    actions.advanceFrame(0, 50, 50);

    const firedWeaponIds: WeaponDefinition['id'][] = [];
    dispatchPlayerActionsThrough(
      actions,
      50,
      createWeaponActionHandlers(weapon, firedWeaponIds),
    );

    expect(firedWeaponIds).toEqual(['pistol']);
    expect(weapon.getState().magazineAmmo).toBe(PISTOL_WEAPON.config.magazineSize - 2);
    expect(weapon.getState().reloadRemainingMs).toBe(PISTOL_WEAPON.config.reloadDurationMs);
  });

  it('fires the current weapon before picking up a replacement', () => {
    const weapon = new WeaponSystem(PISTOL_WEAPON);
    weapon.pickup(POLICE_BATON_WEAPON);
    weapon.selectSlot(0);
    const actions = new PlayerActionQueue();
    actions.reset(0, 0);
    actions.requestFire(40, { x: 1, y: 0 });
    actions.requestWeaponPickup(7, 45);
    actions.advanceFrame(0, 50, 50);

    const firedWeaponIds: WeaponDefinition['id'][] = [];
    dispatchPlayerActionsThrough(
      actions,
      50,
      createWeaponActionHandlers(
        weapon,
        firedWeaponIds,
        new Map([[7, createOwnedWeapon(DOUBLE_BARREL_SHOTGUN_WEAPON)]]),
      ),
    );

    expect(firedWeaponIds).toEqual(['pistol']);
    expect(weapon.getDefinition().id).toBe('doubleBarrelShotgun');
  });

  it('uses the click-time aim after a later pointer move', () => {
    const weapon = new WeaponSystem(POLICE_BATON_WEAPON);
    const actions = new PlayerActionQueue();
    actions.reset(0, 0);
    actions.requestFire(40, { x: 1, y: 0 });
    actions.advanceFrame(0, 50, 50);
    const targets = [
      { id: 'clicked', position: { x: 50, y: 0 }, radius: 18 },
      { id: 'later-aim', position: { x: 0, y: 50 }, radius: 18 },
    ];
    let hitIds: string[] = [];

    dispatchPlayerActionsThrough(actions, 50, {
      ...createWeaponActionHandlers(weapon, []),
      fire: (aimDirection) => {
        hitIds = resolveMeleeHits(
          { x: 0, y: 0 },
          aimDirection,
          targets,
          {
            range: POLICE_BATON_WEAPON.config.range,
            halfAngleRadians: POLICE_BATON_WEAPON.config.halfAngleRadians,
            maxTargets: POLICE_BATON_WEAPON.config.maxTargets,
          },
        ).map((hit) => hit.id);
      },
    });

    expect(hitIds).toEqual(['clicked']);
  });

  it('spends shared stamina on an earlier shove before a later baton attack', () => {
    const weapon = new WeaponSystem(POLICE_BATON_WEAPON);
    const actions = new PlayerActionQueue();
    actions.reset(0, 0);
    actions.requestShove(40, { x: 1, y: 0 });
    actions.requestFire(45, { x: 1, y: 0 });
    actions.advanceFrame(0, 50, 50);
    let stamina: StaminaState = {
      current: POLICE_BATON_WEAPON.config.staminaCost,
    };
    let shovePerformed = false;
    let batonPerformed = false;
    const handlers = createWeaponActionHandlers(weapon, []);
    dispatchPlayerActionsThrough(actions, 50, {
      ...handlers,
      shove: (aimDirection) => {
        const shove = resolveShove(
          stamina,
          { x: 0, y: 0 },
          aimDirection,
          [],
          {
            staminaMax: 100,
            staminaCost: POLICE_BATON_WEAPON.config.staminaCost,
            staminaRecoveryPerSecond: 0,
            range: POLICE_BATON_WEAPON.config.range,
            halfAngleRadians: POLICE_BATON_WEAPON.config.halfAngleRadians,
            pushDistance: 0,
          },
        );
        stamina = shove.stamina;
        shovePerformed = shove.performed;
      },
      fire: () => {
        const cost = POLICE_BATON_WEAPON.config.staminaCost;
        batonPerformed = stamina.current >= cost;
        if (batonPerformed) stamina = { current: stamina.current - cost };
      },
    });

    expect(shovePerformed).toBe(true);
    expect(batonPerformed).toBe(false);
  });
});
