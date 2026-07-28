import { describe, expect, it } from 'vitest';

import {
  advanceSupplyDrop,
  createSupplyTriggerState,
  createSupplyDropState,
  resolveSupplyDropIndicator,
  resolveSupplyDropCrateBounds,
  resolveSupplyDropSnapshot,
  damageSupplyDropCrate,
  canOpenSupplyDropCrate,
  openSupplyDropCrate,
  resolveSupplyTrigger,
  selectSupplyDropLocation,
  totalAvailableAmmo,
  type SupplyDropConfig,
} from '../logic/supplyDrop';
import {
  EMERGENCY_SUPPLY_FALL_DURATION_MS,
  NORMAL_SUPPLY_FALL_DURATION_MS,
  SUPPLY_DROP_BALANCE,
  SUPPLY_DROP_CONFIG,
} from '../config/supplyDropConfig';
import { PISTOL_WEAPON } from '../config/weaponConfig';
import { createWeaponInventory, pickupWeapon } from '../logic/weapon';

const CONFIG: SupplyDropConfig = {
  target: { x: 1_000, y: 700 },
  announcementDurationMs: 2_000,
  flyoverDurationMs: 3_000,
  dropDelayMs: 1_000,
  fallDurationMs: 1_000,
  planeTravel: { x: 1_200, y: 600 },
  fallHeight: 200,
  indicatorMargin: 40,
  crateHealth: 90,
  crateSize: { width: 52, height: 42 },
  interactionRange: 86,
};

describe('supply drop sequence', () => {
  it('slows the plane by half and derives fall durations from shared multipliers', () => {
    expect(SUPPLY_DROP_BALANCE.planeSpeedMultiplier).toBe(0.5);
    expect(SUPPLY_DROP_CONFIG.flyoverDurationMs).toBe(5_600);
    expect(NORMAL_SUPPLY_FALL_DURATION_MS).toBe(3_300);
    expect(EMERGENCY_SUPPLY_FALL_DURATION_MS).toBe(
      NORMAL_SUPPLY_FALL_DURATION_MS * 2,
    );
  });

  it('advances through flyover, delayed fall, and landing by elapsed time', () => {
    let state = createSupplyDropState();
    expect(resolveSupplyDropSnapshot(state, CONFIG).phase).toBe('announced');

    state = advanceSupplyDrop(state, 2_500);
    expect(resolveSupplyDropSnapshot(state, CONFIG).phase).toBe('flyover');

    state = advanceSupplyDrop(state, 500);
    expect(resolveSupplyDropSnapshot(state, CONFIG).phase).toBe('falling');

    state = advanceSupplyDrop(state, 1_000);
    expect(resolveSupplyDropSnapshot(state, CONFIG).phase).toBe('landed');
  });

  it('produces the same result regardless of frame partitioning', () => {
    const oneFrame = advanceSupplyDrop(createSupplyDropState(), 3_500);
    const manyFrames = Array.from({ length: 210 }).reduce<ReturnType<
      typeof createSupplyDropState
    >>(
      (state) => advanceSupplyDrop(state, 1_000 / 60),
      createSupplyDropState(),
    );

    expect(manyFrames.elapsedMs).toBeCloseTo(oneFrame.elapsedMs);
    expect(resolveSupplyDropSnapshot(manyFrames, CONFIG).fallProgress)
      .toBeCloseTo(resolveSupplyDropSnapshot(oneFrame, CONFIG).fallProgress);
  });

  it('moves the plane across the target and the crate down to the ground', () => {
    const planeMidpoint = resolveSupplyDropSnapshot(
      { elapsedMs: 3_000, crateHealth: CONFIG.crateHealth, crateOpened: false },
      CONFIG,
    );
    const falling = resolveSupplyDropSnapshot(
      { elapsedMs: 3_500, crateHealth: CONFIG.crateHealth, crateOpened: false },
      CONFIG,
    );
    const landed = resolveSupplyDropSnapshot(
      { elapsedMs: 4_000, crateHealth: CONFIG.crateHealth, crateOpened: false },
      CONFIG,
    );

    expect(planeMidpoint.planePosition).toEqual(CONFIG.target);
    expect(falling.cratePosition.y).toBe(CONFIG.target.y - 100);
    expect(landed.cratePosition).toEqual(CONFIG.target);
  });

  it('keeps the plane visible after release until it reaches the end of its route', () => {
    const falling = resolveSupplyDropSnapshot(
      { elapsedMs: 3_500, crateHealth: CONFIG.crateHealth, crateOpened: false },
      CONFIG,
    );
    const landedWhileFlying = resolveSupplyDropSnapshot(
      { elapsedMs: 4_500, crateHealth: CONFIG.crateHealth, crateOpened: false },
      CONFIG,
    );
    const routeComplete = resolveSupplyDropSnapshot(
      { elapsedMs: 5_000, crateHealth: CONFIG.crateHealth, crateOpened: false },
      CONFIG,
    );

    expect(falling.planeVisible).toBe(true);
    expect(landedWhileFlying.phase).toBe('landed');
    expect(landedWhileFlying.planeVisible).toBe(true);
    expect(routeComplete.planeProgress).toBe(1);
    expect(routeComplete.planeVisible).toBe(false);
  });

  it('ignores invalid and negative delta time', () => {
    const state = { elapsedMs: 100, crateHealth: 90, crateOpened: false };
    expect(advanceSupplyDrop(state, -20)).toEqual(state);
    expect(advanceSupplyDrop(state, Number.NaN)).toEqual(state);
  });

  it('destroys the crate only when accumulated weapon damage reaches zero', () => {
    const firstHit = damageSupplyDropCrate(createSupplyDropState(30), 18);
    const secondHit = damageSupplyDropCrate(firstHit.state, 18);

    expect(firstHit).toMatchObject({
      state: { crateHealth: 12 },
      died: false,
    });
    expect(secondHit).toMatchObject({
      state: { crateHealth: 0, crateOpened: true },
      died: true,
    });
    expect(resolveSupplyDropSnapshot(secondHit.state, CONFIG).crateDestroyed)
      .toBe(true);
  });

  it('blocks movement only after landing and while the crate is intact', () => {
    const falling = resolveSupplyDropSnapshot(
      { elapsedMs: 3_500, crateHealth: CONFIG.crateHealth, crateOpened: false },
      CONFIG,
    );
    const landed = resolveSupplyDropSnapshot(
      { elapsedMs: 4_000, crateHealth: CONFIG.crateHealth, crateOpened: false },
      CONFIG,
    );
    const destroyed = resolveSupplyDropSnapshot(
      { elapsedMs: 4_000, crateHealth: 0, crateOpened: true },
      CONFIG,
    );

    expect(resolveSupplyDropCrateBounds(falling, CONFIG)).toBeNull();
    expect(resolveSupplyDropCrateBounds(landed, CONFIG)).toEqual({
      x: CONFIG.target.x - CONFIG.crateSize.width / 2,
      y: CONFIG.target.y - CONFIG.crateSize.height / 2,
      ...CONFIG.crateSize,
    });
    expect(resolveSupplyDropCrateBounds(destroyed, CONFIG)).toBeNull();
  });

  it('opens only an intact landed crate within interaction range', () => {
    const state = {
      elapsedMs: 4_000,
      crateHealth: CONFIG.crateHealth,
      crateOpened: false,
    };
    const snapshot = resolveSupplyDropSnapshot(state, CONFIG);

    expect(canOpenSupplyDropCrate(
      snapshot,
      { x: CONFIG.target.x + CONFIG.interactionRange, y: CONFIG.target.y },
      CONFIG,
    )).toBe(true);
    expect(canOpenSupplyDropCrate(
      snapshot,
      { x: CONFIG.target.x + CONFIG.interactionRange + 1, y: CONFIG.target.y },
      CONFIG,
    )).toBe(false);

    const opened = openSupplyDropCrate(state);
    expect(opened.crateOpened).toBe(true);
    expect(resolveSupplyDropCrateBounds(
      resolveSupplyDropSnapshot(opened, CONFIG),
      CONFIG,
    )).toBeNull();
    expect(canOpenSupplyDropCrate(
      resolveSupplyDropSnapshot(opened, CONFIG),
      CONFIG.target,
      CONFIG,
    )).toBe(false);
  });
});

describe('supply trigger rules', () => {
  it('counts shared reserve capacity once for two weapons using the same ammo type', () => {
    const inventory = pickupWeapon(
      createWeaponInventory(PISTOL_WEAPON),
      PISTOL_WEAPON,
    ).state;
    const expectedAmmo = PISTOL_WEAPON.config.magazineSize * 2
      + PISTOL_WEAPON.config.reserveAmmo;

    expect(totalAvailableAmmo(inventory, {
      pistolAmmo: PISTOL_WEAPON.config.reserveAmmo,
      rifleAmmo: 0,
    })).toEqual({
      current: expectedAmmo,
      capacity: expectedAmmo,
    });
  });

  it('triggers emergency supply immediately only when no supply is active', () => {
    const initial = createSupplyTriggerState();
    const emergency = resolveSupplyTrigger(initial, {
      activeSupply: false,
      waveCleared: false,
      allAmmoDepleted: true,
      ammoRatio: 0,
      healthRatio: 1,
      randomValue: 1,
    }, SUPPLY_DROP_BALANCE);
    const blocked = resolveSupplyTrigger(initial, {
      activeSupply: true,
      waveCleared: true,
      allAmmoDepleted: true,
      ammoRatio: 0,
      healthRatio: 0,
      randomValue: 0,
    }, SUPPLY_DROP_BALANCE);

    expect(emergency.kind).toBe('emergency');
    expect(blocked.kind).toBeNull();
  });

  it('raises normal supply chance for low ammo, critical health, and consecutive misses', () => {
    const healthy = resolveSupplyTrigger(createSupplyTriggerState(), {
      activeSupply: false,
      waveCleared: true,
      allAmmoDepleted: false,
      ammoRatio: 1,
      healthRatio: 1,
      randomValue: 0.99,
    }, SUPPLY_DROP_BALANCE);
    const needy = resolveSupplyTrigger({ consecutiveMisses: 2 }, {
      activeSupply: false,
      waveCleared: true,
      allAmmoDepleted: false,
      ammoRatio: 0.05,
      healthRatio: 0.2,
      randomValue: 0.5,
    }, SUPPLY_DROP_BALANCE);

    expect(healthy.kind).toBeNull();
    expect(healthy.state.consecutiveMisses).toBe(1);
    expect(needy.chance).toBeGreaterThan(healthy.chance);
    expect(needy.kind).toBe('normal');
    expect(needy.state.consecutiveMisses).toBe(0);
  });
});

describe('supply location selection', () => {
  const locationConfig = {
    sampleCount: 128,
    clearance: 30,
    normalMinimumPlayerDistance: 150,
    normalMaximumPlayerDistance: 500,
    emergencyMinimumPlayerDistance: 500,
    previousDropMinimumDistance: 180,
  };

  it('selects a reachable normal location outside obstacles and away from the previous drop', () => {
    const obstacles = [{ x: 350, y: 200, width: 200, height: 300 }];
    const target = selectSupplyDropLocation(
      'normal',
      { x: 100, y: 350 },
      { width: 900, height: 700 },
      obstacles,
      { x: 250, y: 350 },
      { x: 1, y: 0 },
      42,
      locationConfig,
    );

    expect(target).not.toBeNull();
    expect(Math.hypot(target!.x - 100, target!.y - 350)).toBeGreaterThanOrEqual(150);
    expect(Math.hypot(target!.x - 250, target!.y - 350)).toBeGreaterThanOrEqual(180);
    expect(
      target!.x >= 320 && target!.x <= 580
      && target!.y >= 170 && target!.y <= 530,
    ).toBe(false);
  });

  it('places emergency supply farther away and favors the threat direction', () => {
    const target = selectSupplyDropLocation(
      'emergency',
      { x: 300, y: 300 },
      { width: 1_400, height: 800 },
      [],
      null,
      { x: 1, y: 0 },
      7,
      locationConfig,
    );

    expect(target).not.toBeNull();
    expect(Math.hypot(target!.x - 300, target!.y - 300)).toBeGreaterThanOrEqual(500);
    expect(target!.x).toBeGreaterThan(300);
  });
});

describe('supply drop indicator', () => {
  it('clamps an off-screen target to the viewport edge', () => {
    expect(resolveSupplyDropIndicator(
      { x: 1_200, y: 300 },
      { width: 800, height: 600 },
      40,
    )).toMatchObject({
      visible: true,
      position: { x: 760, y: 300 },
      rotation: 0,
    });
  });

  it('hides when the target is already inside the safe viewport', () => {
    expect(resolveSupplyDropIndicator(
      { x: 400, y: 300 },
      { width: 800, height: 600 },
      40,
    ).visible).toBe(false);
  });
});
