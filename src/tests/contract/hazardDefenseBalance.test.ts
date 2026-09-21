import { createPathfindingGrid } from '../../logic/pathfinding';
import { createZombieNavigationState, updateZombieNavigation, type ZombieNavigationState } from '../../logic/zombieNavigation';
import { PATHFINDING_CONFIG } from '../../config/pathfindingConfig';
import { ZOMBIE_CROWD_SPACING_CONFIG } from '../../config/zombieCrowdSpacingConfig';
import { resolveZombieCrowdSpacing } from '../../logic/zombieCrowdSpacing';
import { queryZombieCollisionCandidates } from '../../logic/zombieSpatialGrid';
import { movePursuingZombie } from '../../logic/zombiePursuit';
import { describe, expect, it } from 'vitest';
import { HAZARD_DEFENSE_CONFIG, HAZARD_INFLOW_CONFIG } from '../../config/lastStandCombatConfig';
import { PISTOL_WEAPON } from '../../config/weaponConfig';
import { ZOMBIE_CONFIG } from '../../config/zombieConfig';
import { DefenseSpawnSystem } from '../../systems/DefenseSpawnSystem';
import { LastStandCombat } from '../../systems/LastStandCombat';
import { WeaponSystem } from '../../systems/WeaponSystem';
import { DamageSystem } from '../../systems/DamageSystem';
import { moveCircleWithObstacles } from '../../logic/obstacleCollision';
import { resolveHitscan } from '../../logic/hitscan';

/** Accurate 5 shots/sec, immediate reload, 200ms acquisition, 520-unit sight.
 * This is a repeatable pressure reference, not a prediction of human win rates.
 */
function defendNight(shoot: boolean) {
  let seed = 17;
  const random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 0x100000000; };
  const layout = HAZARD_DEFENSE_CONFIG;
  const obstacles = [...layout.walls, ...(layout.fixtures ?? []).map(f => ({ ...f, blocksHitscan: true }))];
  const grid = createPathfindingGrid(layout.worldSize, obstacles, {
    cellSize: PATHFINDING_CONFIG.cellSize, clearance: ZOMBIE_CONFIG.radius + PATHFINDING_CONFIG.obstacleClearance,
  });
  const navigation = new Map<string, ZombieNavigationState>();
  const night = new LastStandCombat(layout, { 'hazard-main': 100 });
  const spawn = new DefenseSpawnSystem(layout, HAZARD_INFLOW_CONFIG, ZOMBIE_CONFIG.radius, random);
  const weapon = new WeaponSystem(PISTOL_WEAPON, {}, { unlimitedReserve: true });
  const damage = new DamageSystem();
  const player = { start: layout.playerSpawn, end: layout.playerSpawn, radius: 20 };
  let zombies: Array<{ kind: 'normal' | 'fast'; id: string; position: { x: number; y: number }; health: number; radius: number }> = [];
  let triggerMs = 0;
  let targetId = '';
  let kills = 0;
  night.start();
  while (night.getPhase() === 'COMBAT') {
    const dt = 20;
    weapon.update(dt);
    triggerMs -= dt;
    const target = zombies.filter(z => Math.hypot(z.position.x - player.end.x, z.position.y - player.end.y) <= 520)
      .sort((a, b) => b.position.x - a.position.x)[0];
    if (target && targetId !== target.id) { targetId = target.id; triggerMs = Math.max(triggerMs, 200); }
    if (shoot && target && triggerMs <= 0 && weapon.fire()) {
      const offset = { x: target.position.x - player.end.x, y: target.position.y - player.end.y };
      const length = Math.hypot(offset.x, offset.y);
      const hit = resolveHitscan(player.end, { x: offset.x / length, y: offset.y / length },
        PISTOL_WEAPON.config.range, zombies, 1, obstacles).hits[0];
      if (hit) damage.apply(zombies.find(z => z.id === hit.targetId)!, PISTOL_WEAPON.config.damage);
      triggerMs = 200;
    }
    if (weapon.getState().magazineAmmo === 0) weapon.reload();
    kills += zombies.filter(z => z.health <= 0).length;
    zombies = zombies.filter(z => z.health > 0);
    // Resolve the whole crowd before moving any zombie, as GameScene does.
    const crowdSpacing = resolveZombieCrowdSpacing(
      zombies,
      queryZombieCollisionCandidates(zombies),
      ZOMBIE_CROWD_SPACING_CONFIG,
      ZOMBIE_CONFIG.speed,
    );
    const motions = zombies.map(z => {
      const start = z.position;
      const target = night.getTarget(z.id, start, player.end);
      const route = updateZombieNavigation(navigation.get(z.id) ?? createZombieNavigationState(),
        start, target, grid, obstacles, z.radius, player.radius, PATHFINDING_CONFIG, dt);
      navigation.set(z.id, route.state);
      const separationVelocity = crowdSpacing.valid
        ? crowdSpacing.velocities.get(z.id) ?? { x: 0, y: 0 }
        : { x: 0, y: 0 };
      const desiredPosition = movePursuingZombie(z, route.target, separationVelocity, dt, ZOMBIE_CONFIG);
      z.position = moveCircleWithObstacles(start, desiredPosition,
        z.radius, night.getMovementObstacles(), { ...layout.worldSize, padding: z.radius });
      return { id: z.id, start, end: z.position, radius: z.radius };
    });
    const died = night.resolveContacts(player, motions, dt);
    night.advanceTime(dt, !died);
    if (night.getPhase() === 'COMBAT') for (const entry of spawn.update(dt, zombies.length)) {
      night.registerZombie(entry.id, entry.sectorId);
      zombies.push({ kind: entry.kind, id: entry.id, position: entry.position, radius: ZOMBIE_CONFIG.radius, health: ZOMBIE_CONFIG.health });
    }
  }
  return { phase: night.getPhase(), integrity: night.getSectors()[0].integrity, kills };
}

describe('Hazard pistol defense balance', () => {
  it('charges one percentage point for each of three landed attacks during accurate pistol defense', () => {
    const result = defendNight(true);
    expect(result.phase).toBe('VICTORY');
    expect(result.integrity).toBeGreaterThan(20);
    expect(result.integrity).toBe(97);
  });
  it('loses an undefended barricade before dawn', () => {
    expect(defendNight(false).phase).toBe('DEFEAT');
  });
});
