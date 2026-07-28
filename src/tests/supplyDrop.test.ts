import { describe, expect, it } from 'vitest';

import {
  advanceSupplyDrop,
  createSupplyDropState,
  resolveSupplyDropIndicator,
  resolveSupplyDropCrateBounds,
  resolveSupplyDropSnapshot,
  damageSupplyDropCrate,
  canOpenSupplyDropCrate,
  openSupplyDropCrate,
  type SupplyDropConfig,
} from '../logic/supplyDrop';

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
  it('advances through flyover, delayed fall, and landing by elapsed time', () => {
    let state = createSupplyDropState();
    expect(resolveSupplyDropSnapshot(state, CONFIG).phase).toBe('announced');

    state = advanceSupplyDrop(state, 2_500);
    expect(resolveSupplyDropSnapshot(state, CONFIG).phase).toBe('flyover');

    state = advanceSupplyDrop(state, 2_500);
    expect(resolveSupplyDropSnapshot(state, CONFIG).phase).toBe('drop-pending');

    state = advanceSupplyDrop(state, 1_500);
    expect(resolveSupplyDropSnapshot(state, CONFIG).phase).toBe('falling');

    state = advanceSupplyDrop(state, 500);
    expect(resolveSupplyDropSnapshot(state, CONFIG).phase).toBe('landed');
  });

  it('produces the same result regardless of frame partitioning', () => {
    const oneFrame = advanceSupplyDrop(createSupplyDropState(), 6_500);
    const manyFrames = Array.from({ length: 390 }).reduce<ReturnType<
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
      { elapsedMs: 3_500, crateHealth: CONFIG.crateHealth, crateOpened: false },
      CONFIG,
    );
    const falling = resolveSupplyDropSnapshot(
      { elapsedMs: 6_500, crateHealth: CONFIG.crateHealth, crateOpened: false },
      CONFIG,
    );
    const landed = resolveSupplyDropSnapshot(
      { elapsedMs: 7_000, crateHealth: CONFIG.crateHealth, crateOpened: false },
      CONFIG,
    );

    expect(planeMidpoint.planePosition).toEqual(CONFIG.target);
    expect(falling.cratePosition.y).toBe(CONFIG.target.y - 100);
    expect(landed.cratePosition).toEqual(CONFIG.target);
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
      { elapsedMs: 6_500, crateHealth: CONFIG.crateHealth, crateOpened: false },
      CONFIG,
    );
    const landed = resolveSupplyDropSnapshot(
      { elapsedMs: 7_000, crateHealth: CONFIG.crateHealth, crateOpened: false },
      CONFIG,
    );
    const destroyed = resolveSupplyDropSnapshot(
      { elapsedMs: 7_000, crateHealth: 0, crateOpened: true },
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
      elapsedMs: 7_000,
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
