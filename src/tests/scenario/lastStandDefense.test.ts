import { createPathfindingGrid } from '../../logic/pathfinding';
import { createZombieNavigationState, updateZombieNavigation } from '../../logic/zombieNavigation';
import { PATHFINDING_CONFIG } from '../../config/pathfindingConfig';
import { segmentAreaEntry } from '../../logic/defenseSector';
import { describe, expect, it } from 'vitest';
import { HAZARD_DEFENSE_CONFIG } from '../../config/lastStandCombatConfig';
import { PISTOL_WEAPON } from '../../config/weaponConfig';
import { LastStandCombat } from '../../systems/LastStandCombat';
import { WeaponSystem } from '../../systems/WeaponSystem';
import { DamageSystem } from '../../systems/DamageSystem';
import { resolveHitscan } from '../../logic/hitscan';
import { moveToward } from '../../logic/movement';
import { moveCircleWithObstacles } from '../../logic/obstacleCollision';
import { ZOMBIE_CONFIG } from '../../config/zombieConfig';

const layout = HAZARD_DEFENSE_CONFIG;
const player = { start: layout.playerSpawn, end: layout.playerSpawn, radius: 20 };

describe('Hazard defense', () => {
  it('kills an approaching zombie through the barricade with the shared weapon and hitscan systems', () => {
    const night = new LastStandCombat(layout, { 'hazard-main': 80 });
    const weapon = new WeaponSystem(PISTOL_WEAPON, {}, { unlimitedReserve: true });
    const damage = new DamageSystem();
    const zombie = { health: ZOMBIE_CONFIG.health, id: 'z1', position: { x: 1048, y: 700 }, radius: 20 };
    night.start();
    night.registerZombie(zombie.id, 'mainEntrance');
    while (zombie.health > 0) {
      expect(weapon.fire()).toBe(true);
      const result = resolveHitscan(player.start, { x: -1, y: 0 }, PISTOL_WEAPON.config.range, [zombie], 1, layout.walls);
      expect(result.hits.map(hit => hit.targetId)).toEqual(['z1']);
      damage.apply(zombie, PISTOL_WEAPON.config.damage);
      weapon.update(PISTOL_WEAPON.config.fireIntervalMs);
    }
    night.resolveContacts(player, [], 1000);
    expect(night.getSectors()[0].integrity).toBe(80);
    night.advanceTime(night.durationMs, true);
    expect(night.getPhase()).toBe('VICTORY');
  });

  it.each([560, 840])('enters through the doorway from outside y=%s and stops at the indoor barricade', y => {
    const result = approachFromOutside(y);
    expect(result.crossedDoorway).toBe(true);
    expect(result.crossedApproach).toBe(true);
    expect(result.position.x).toBeCloseTo(layout.sectors[0].barricade.x - ZOMBIE_CONFIG.radius);
    expect(result.integrity).toBeLessThan(80);
    expect(result.phase).toBe('COMBAT');
  });

  it('breaches the barricade, enters the interior and ends the night on player contact', () => {
    const night = new LastStandCombat(layout, { 'hazard-main': 0.15 });
    night.start();
    night.registerZombie('z1', 'mainEntrance');
    let position = { x: 1048, y: 700 };
    for (let i = 0; i < 500 && night.getPhase() === 'COMBAT'; i++) {
      const target = night.getTarget('z1', position, player.end);
      const next = moveCircleWithObstacles(position, moveToward(position, target, ZOMBIE_CONFIG.speed, 16),
        20, night.getMovementObstacles(), { ...layout.worldSize, padding: 20 });
      night.resolveContacts(player, [{ id: 'z1', start: position, end: next, radius: 20 }], 16);
      position = next;
      night.advanceTime(16, night.getPhase() !== 'DEFEAT');
    }
    expect(night.getSectors()[0].phase).toBe('BREACHED');
    expect(position.x).toBeGreaterThan(layout.combatArea.x);
    expect(night.getPhase()).toBe('DEFEAT');
  });
});

function approachFromOutside(y: number) {
  const night = new LastStandCombat(layout, { 'hazard-main': 80 });
  const obstacles = [...layout.walls, ...(layout.fixtures ?? [])];
  const grid = createPathfindingGrid(layout.worldSize, obstacles, {
    cellSize: PATHFINDING_CONFIG.cellSize, clearance: ZOMBIE_CONFIG.radius + PATHFINDING_CONFIG.obstacleClearance,
  });
  let navigation = createZombieNavigationState();
  let position = { x: 220, y };
  let crossedDoorway = false;
  let crossedApproach = false;
  night.start();
  night.registerZombie('entrant', 'mainEntrance');
  for (let elapsed = 0; elapsed < 20000 && night.getSectors()[0].integrity === 80; elapsed += 16) {
    const target = night.getTarget('entrant', position, player.end);
    const route = updateZombieNavigation(navigation, position, target, grid, obstacles,
      ZOMBIE_CONFIG.radius, player.radius, PATHFINDING_CONFIG, 16);
    navigation = route.state;
    const next = moveCircleWithObstacles(position, moveToward(position, route.target, ZOMBIE_CONFIG.speed, 16),
      ZOMBIE_CONFIG.radius, night.getMovementObstacles(), { ...layout.worldSize, padding: ZOMBIE_CONFIG.radius });
    crossedDoorway ||= segmentAreaEntry(position, next, layout.sectors[0].entranceArea) !== null;
    crossedApproach ||= segmentAreaEntry(position, next, layout.sectors[0].approachArea) !== null;
    night.resolveContacts(player, [{ id: 'entrant', start: position, end: next, radius: ZOMBIE_CONFIG.radius }], 16);
    position = next;
  }
  return { position, crossedDoorway, crossedApproach, integrity: night.getSectors()[0].integrity, phase: night.getPhase() };
}
