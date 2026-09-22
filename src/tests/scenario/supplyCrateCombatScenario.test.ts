import { describe, expect, it } from 'vitest';
import { SUPPLY_DROP_CONFIG } from '../../config/supplyDropConfig';
import { resolveHitscan } from '../../logic/hitscan';
import { DamageSystem } from '../../systems/DamageSystem';
import { SupplyDropSystem } from '../../systems/SupplyDropSystem';

describe('supply crate combat', () => {
  it('blocks a shot at the crate and exposes the zombie behind it after destruction', () => {
    const supply = new SupplyDropSystem(() => 0);
    expect(supply.tryTrigger(
      { waveCleared: true, ammoRatio: 1, healthRatio: 1 },
      { x: 1_000, y: 1_000 },
      { width: 2_000, height: 2_000 },
      [],
    )).toBe(true);
    supply.advance(SUPPLY_DROP_CONFIG.announcementDurationMs
      + SUPPLY_DROP_CONFIG.dropDelayMs + SUPPLY_DROP_CONFIG.fallDurationMs);
    const crate = supply.getCrateTarget()!;
    const zombie = {
      id: 'behind-crate', health: 50, radius: 18,
      position: { x: crate.position.x + 100, y: crate.position.y },
    };
    const origin = { x: crate.position.x - 100, y: crate.position.y };
    const shot = resolveHitscan(
      origin, { x: 1, y: 0 }, 500, [crate, zombie], 2,
      [supply.getCrateObstacle()!],
    );

    expect(shot.hits.map(hit => hit.targetId)).toEqual([crate.id]);
    expect(supply.isCrateTarget(shot.hits[0].targetId)).toBe(true);
    expect(supply.damageCrate(SUPPLY_DROP_CONFIG.crateHealth).died).toBe(true);
    expect(supply.claimLoot()).toBe(true);
    supply.completeLootRelease();
    expect(zombie.health).toBe(50);

    const remainingCrate = supply.getCrateTarget();
    const remainingObstacle = supply.getCrateObstacle();
    const nextShot = resolveHitscan(
      origin, { x: 1, y: 0 }, 500,
      [zombie, ...(remainingCrate ? [remainingCrate] : [])], 2,
      remainingObstacle ? [remainingObstacle] : [],
    );
    expect(nextShot.hits.map(hit => hit.targetId)).toEqual([zombie.id]);
    const damage = new DamageSystem();
    damage.apply(zombie, 25);
    expect(zombie.health).toBe(25);
    expect(supply.claimLoot()).toBe(false);
  });
});
