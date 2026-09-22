import { describe, expect, it } from 'vitest';
import { SUPPLY_DROP_BALANCE, SUPPLY_DROP_CONFIG } from '../../config/supplyDropConfig';
import { SupplyDropSystem } from '../../systems/SupplyDropSystem';

const player = { x: 1_000, y: 1_000 };
const bounds = { width: 2_000, height: 2_000 };
const triggerInput = { waveCleared: true, ammoRatio: 1, healthRatio: 1 };
const landingTime = SUPPLY_DROP_CONFIG.announcementDurationMs
  + SUPPLY_DROP_CONFIG.dropDelayMs + SUPPLY_DROP_CONFIG.fallDurationMs;

function startDrop(system: SupplyDropSystem): void {
  expect(system.tryTrigger(triggerInput, player, bounds, [])).toBe(true);
}

function landedDrop(): SupplyDropSystem {
  const system = new SupplyDropSystem(() => 0);
  startDrop(system);
  system.advance(landingTime);
  return system;
}

describe('SupplyDropSystem', () => {
  it('keeps a new session inactive without interaction or collision targets', () => {
    const system = new SupplyDropSystem(() => 0);
    const initial = system.getSnapshot();
    system.advance(landingTime);

    expect(system.isActive()).toBe(false);
    expect(system.getSnapshot()).toEqual(initial);
    expect(system.getCrateTarget()).toBeNull();
    expect(system.getCrateObstacle()).toBeNull();
    expect(system.open(player)).toBe(false);
    expect(system.claimLoot()).toBe(false);
  });

  it('waits for wave completion and preserves an already active drop', () => {
    const system = new SupplyDropSystem(() => 0);
    expect(system.tryTrigger({ ...triggerInput, waveCleared: false }, player, bounds, [])).toBe(false);
    startDrop(system);
    system.advance(100);
    const active = system.getSnapshot();

    expect(system.tryTrigger(triggerInput, player, bounds, [])).toBe(false);
    expect(system.getSnapshot()).toEqual(active);
  });

  it('exposes interaction and collision together when the crate lands', () => {
    const system = new SupplyDropSystem(() => 0);
    startDrop(system);
    const target = system.getSnapshot().target;
    system.advance(landingTime - 1);
    expect(system.getCrateTarget()).toBeNull();
    expect(system.getCrateObstacle()).toBeNull();
    expect(system.open(target)).toBe(false);

    system.advance(1);
    expect(system.getCrateTarget()?.position).toEqual(target);
    expect(system.getCrateObstacle()).toEqual({
      x: target.x - SUPPLY_DROP_CONFIG.crateSize.width / 2,
      y: target.y - SUPPLY_DROP_CONFIG.crateSize.height / 2,
      ...SUPPLY_DROP_CONFIG.crateSize,
      blocksHitscan: true,
    });
    expect(system.canOpen(target)).toBe(true);
  });

  it('preserves the drop snapshot across different frame partitions', () => {
    const single = new SupplyDropSystem(() => 0);
    const split = new SupplyDropSystem(() => 0);
    startDrop(single);
    startDrop(split);
    single.advance(landingTime + 100);
    split.advance(1_000);
    split.advance(landingTime - 1_000);
    split.advance(100);

    expect(split.getSnapshot()).toEqual(single.getSnapshot());
    expect(split.getCrateTarget()).toEqual(single.getCrateTarget());
  });

  it('opens only within reach and authorizes loot once before presentation completes', () => {
    const system = landedDrop();
    const target = system.getSnapshot().target;
    expect(system.open({ x: target.x + SUPPLY_DROP_CONFIG.interactionRange + 1, y: target.y })).toBe(false);
    expect(system.getCrateTarget()).not.toBeNull();
    expect(system.open(target)).toBe(true);
    expect(system.open(target)).toBe(false);
    expect(system.getCrateTarget()).toBeNull();
    expect(system.getCrateObstacle()).toBeNull();
    expect(system.claimLoot()).toBe(true);
    expect(system.claimLoot()).toBe(false);
    expect(system.isActive()).toBe(true);
    expect(system.getSnapshot().crateOpened).toBe(true);

    system.completeLootRelease();
    expect(system.isActive()).toBe(false);
    expect(system.claimLoot()).toBe(false);
  });

  it('releases destroyed crate loot once even when remaining pellets hit the captured target', () => {
    const system = landedDrop();
    const targetId = system.getCrateTarget()!.id;
    expect(system.damageCrate(SUPPLY_DROP_CONFIG.crateHealth - 1).died).toBe(false);
    expect(system.getCrateTarget()).not.toBeNull();
    expect(system.damageCrate(1).died).toBe(true);
    expect(system.getCrateTarget()).toBeNull();
    expect(system.getCrateObstacle()).toBeNull();
    expect(system.getSnapshot().crateDestroyed).toBe(true);
    expect(system.claimLoot()).toBe(true);
    system.completeLootRelease();

    expect(system.isCrateTarget(targetId)).toBe(true);
    expect(system.isCrateTarget('zombie-1')).toBe(false);
    expect(system.damageCrate(SUPPLY_DROP_CONFIG.crateHealth).died).toBe(false);
    expect(system.claimLoot()).toBe(false);
    expect(system.open(system.getSnapshot().target)).toBe(false);
  });

  it('retains the miss bonus when a successful roll cannot find a landing location', () => {
    let roll = 1;
    const system = new SupplyDropSystem(() => roll);
    expect(system.tryTrigger(triggerInput, player, bounds, [])).toBe(false);
    roll = SUPPLY_DROP_BALANCE.normalBaseChance
      + SUPPLY_DROP_BALANCE.consecutiveMissChanceBonus / 2;
    expect(system.tryTrigger(triggerInput, player, bounds, [
      { x: 0, y: 0, ...bounds },
    ])).toBe(false);
    expect(system.isActive()).toBe(false);
    startDrop(system);
    system.advance(landingTime);
    system.open(system.getSnapshot().target);
    expect(system.claimLoot()).toBe(true);
    system.completeLootRelease();

    // Successful placement resets the bonus: the same roll now misses.
    expect(system.tryTrigger(triggerInput, player, bounds, [])).toBe(false);
  });

  it('starts the next drop away from the previous crate with fresh health and loot', () => {
    const system = landedDrop();
    const previous = system.getSnapshot().target;
    system.damageCrate(SUPPLY_DROP_CONFIG.crateHealth);
    expect(system.claimLoot()).toBe(true);
    system.completeLootRelease();
    startDrop(system);
    const next = system.getSnapshot();

    expect(Math.hypot(next.target.x - previous.x, next.target.y - previous.y))
      .toBeGreaterThanOrEqual(SUPPLY_DROP_BALANCE.previousDropMinimumDistance);
    expect(next.phase).toBe('announced');
    expect(next.crateOpened).toBe(false);
    expect(next.crateDestroyed).toBe(false);
    system.advance(landingTime);
    expect(system.damageCrate(SUPPLY_DROP_CONFIG.crateHealth - 1).died).toBe(false);
    expect(system.damageCrate(1).died).toBe(true);
    expect(system.claimLoot()).toBe(true);
  });

  it('repositions the active crate on resize without resetting its phase or damage', () => {
    const system = landedDrop();
    system.damageCrate(SUPPLY_DROP_CONFIG.crateHealth - 1);
    const before = system.getSnapshot();
    system.revalidateCoordinates({ width: 300, height: 300 }, []);
    const after = system.getSnapshot();
    const clearance = SUPPLY_DROP_BALANCE.locationClearance;

    expect(after.target).not.toEqual(before.target);
    expect(after.target.x).toBeGreaterThanOrEqual(clearance);
    expect(after.target.x).toBeLessThanOrEqual(300 - clearance);
    expect(after.target.y).toBeGreaterThanOrEqual(clearance);
    expect(after.target.y).toBeLessThanOrEqual(300 - clearance);
    expect(after.phase).toBe(before.phase);
    expect(after.smokeElapsedMs).toBe(before.smokeElapsedMs);
    expect(system.getCrateTarget()?.position).toEqual(after.target);
    expect(system.damageCrate(1).died).toBe(true);
  });
});
