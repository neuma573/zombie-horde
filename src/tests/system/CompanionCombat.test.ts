import { describe, expect, it } from 'vitest';
import { CompanionCombat } from '../../systems/CompanionCombat';
import { createCompanion } from '../../logic/companion';
import type { CompanionDeployment } from '../../types/companion';
import { HAZARD_DEFENSE_CONFIG } from '../../config/lastStandCombatConfig';
import { COMPANION_CONFIG } from '../../config/companionConfig';
import { PLAYER_CONFIG } from '../../config/playerConfig';
import { hasDirectPath } from '../../logic/pathfinding';
import { SIMULATION_CONFIG } from '../../config/simulationConfig';

const position = { x: 200, y: 200 };
const exit = { x: 500, y: 200 };
const target = { id: 'z', position: { x: 100, y: 200 }, radius: 18, health: 10000 };
function deployment(courage = 50): CompanionDeployment {
  return { companion: { ...createCompanion('ally', 2, () => 0), courage }, weaponId: null };
}
describe('CompanionCombat', () => {
  it('escapes through the rear doorway from every defense position without crossing walls or fixtures', () => {
    const layout = HAZARD_DEFENSE_CONFIG;
    const blockers = [...layout.walls, ...(layout.fixtures ?? []).map(fixture => ({ ...fixture, blocksHitscan: true })),
      ...layout.sectors.map(sector => ({ ...sector.barricade, blocksHitscan: true }))];
    for (const home of layout.allyPositions) {
      for (const offset of [{ x: 0, y: 0 }, { x: 24, y: 0 }, { x: -24, y: 0 }, { x: 0, y: 24 }, { x: 0, y: -24 }]) {
        const start = { x: home.x + offset.x, y: home.y + offset.y };
        // Repositioning cannot put a companion inside a fixture in the first place.
        if (!hasDirectPath(start, start, blockers, PLAYER_CONFIG.radius - 1e-5)) continue;
        const combat = new CompanionCombat([deployment(0)], [start], layout.companionRetreat.exit,
          layout.combatArea, layout.interiorArea, layout.companionRetreat.waypoints);
        let previous = start;
        for (let elapsed = 0; elapsed < 3000; elapsed += SIMULATION_CONFIG.fixedStepMs) {
          expect(combat.advance(SIMULATION_CONFIG.fixedStepMs, 100, [], blockers)).toEqual([]);
          const pose = combat.getPoses()[0];
          expect(hasDirectPath(previous, pose.position, blockers, PLAYER_CONFIG.radius - 1e-5)).toBe(true);
          previous = pose.position;
        }
        expect(combat.getPoses()[0]).toMatchObject({ state: 'left', position: layout.companionRetreat.exit });
      }
    }
  });

  it('does not walk through an obstructed retreat exit or mark it reached', () => {
    const combat = new CompanionCombat([deployment(0)], [position], exit);
    combat.advance(4000, 100, [], [{ x: 300, y: 0, width: 32, height: 500, blocksHitscan: true }]);
    expect(combat.getPoses()[0].state).toBe('fleeing');
    expect(combat.getPoses()[0].position.x).toBeLessThanOrEqual(300 - PLAYER_CONFIG.radius);
  });

  it('follows the same retreat route across different frame sizes', () => {
    const layout = HAZARD_DEFENSE_CONFIG;
    const make = () => new CompanionCombat([deployment(0)], [layout.allyPositions[3]], layout.companionRetreat.exit,
      layout.combatArea, layout.interiorArea, layout.companionRetreat.waypoints);
    const whole = make();
    const split = make();
    whole.advance(1000, 100, [], layout.walls);
    for (let step = 0; step < 10; step++) split.advance(100, 100, [], layout.walls);
    expect(split.getPoses()).toEqual(whole.getPoses());
  });

  it('takes time to acquire and aim at a newly visible target', () => {
    const combat = new CompanionCombat([deployment()], [position], exit);
    expect(combat.advance(600, 100, [target], [])).toEqual([]);
    expect(combat.advance(700, 100, [target], []).length).toBeGreaterThan(0);
  });

  it('pauses irregularly between trigger pulls instead of using the pistol fire-rate limit', () => {
    const combat = new CompanionCombat([{ ...deployment(), weaponId: 'pistol' }], [position], exit);
    const firedAt: number[] = [];
    for (let elapsed = 20; elapsed <= 10000; elapsed += 20) {
      if (combat.advance(20, 100, [target], []).length) firedAt.push(elapsed);
    }
    const intervals = firedAt.slice(1).map((time, index) => time - firedAt[index]);

    expect(firedAt.length).toBeGreaterThan(2);
    expect(firedAt.length).toBeLessThanOrEqual(10);
    expect(intervals.every(interval => interval >= 750)).toBe(true);
    expect(new Set(intervals).size).toBeGreaterThan(1);
  });

  it('fires the default pistol regularly while retaining deliberate pauses', () => {
    const combat = new CompanionCombat([deployment()], [position], exit);
    const firedAt: number[] = [];
    for (let elapsed = 20; elapsed <= 12000; elapsed += 20) {
      if (combat.advance(20, 100, [target], []).length) firedAt.push(elapsed);
    }
    const intervals = firedAt.slice(1).map((time, index) => time - firedAt[index]);

    expect(firedAt.length).toBeGreaterThanOrEqual(6);
    expect(firedAt.length).toBeLessThanOrEqual(9);
    expect(intervals.every(interval => interval >= 1000)).toBe(true);
    expect(new Set(intervals).size).toBeGreaterThan(1);
  });

  it('reacquires a replacement target instead of firing at it immediately', () => {
    const combat = new CompanionCombat([{ ...deployment(), weaponId: 'pistol' }], [position], exit);
    combat.advance(1500, 100, [target], []);
    combat.advance(2000, 100, [], []);
    const replacement = { ...target, id: 'replacement' };

    expect(combat.advance(600, 100, [replacement], [])).toEqual([]);
    expect(combat.advance(700, 100, [replacement], []).length).toBeGreaterThan(0);
  });

  it('occasionally steps around its defense position and remains inside its assigned area', () => {
    const combat = new CompanionCombat([deployment()], [position], exit);
    let moved = false;
    let stoodStill = false;
    let previous = position;
    for (let elapsed = 100; elapsed <= 15000; elapsed += 100) {
      combat.advance(100, 100, [], []);
      const pose = combat.getPoses()[0];
      const distance = Math.hypot(pose.position.x - position.x, pose.position.y - position.y);
      expect(distance).toBeLessThanOrEqual(24.01);
      moved ||= Math.hypot(pose.position.x - previous.x, pose.position.y - previous.y) > 0.1;
      stoodStill ||= Math.hypot(pose.position.x - previous.x, pose.position.y - previous.y) < 0.01;
      previous = pose.position;
    }
    expect(moved).toBe(true);
    expect(stoodStill).toBe(true);
  });

  it('finishes a rifle burst then pauses before pulling the trigger again', () => {
    const combat = new CompanionCombat([{ ...deployment(), weaponId: 'burstRifle' }], [position], exit);
    const firedAt: number[] = [];
    for (let elapsed = 10; elapsed <= 4000; elapsed += 10) {
      for (const _shot of combat.advance(10, 100, [target], [])) firedAt.push(elapsed);
    }
    expect(firedAt.length).toBeGreaterThanOrEqual(6);
    expect(firedAt[1] - firedAt[0]).toBeGreaterThanOrEqual(60);
    expect(firedAt[2] - firedAt[1]).toBeLessThanOrEqual(80);
    expect(firedAt[3] - firedAt[2]).toBeGreaterThanOrEqual(750);
  });

  it('keeps aiming at its target when another zombie moves closer', () => {
    const combat = new CompanionCombat([deployment()], [position], exit);
    combat.advance(300, 100, [target], []);
    const closer = { ...target, id: 'closer', position: { x: 200, y: 140 } };

    const shots = combat.advance(1000, 100, [target, closer], []);

    expect(shots).toHaveLength(1);
    expect(shots[0].hits).toEqual([{ id: target.id, damage: 10 }]);
  });

  it('keeps an in-progress burst on its old aim while reacquiring a new target', () => {
    const combat = new CompanionCombat([{ ...deployment(), weaponId: 'burstRifle' }], [position], exit);
    let firstShot = false;
    for (let elapsed = 0; elapsed < 1300 && !firstShot; elapsed += 10) {
      firstShot = combat.advance(10, 100, [target], []).length > 0;
    }
    expect(firstShot).toBe(true);
    const replacement = { ...target, id: 'replacement', position: { x: 200, y: 100 } };

    const remainder = combat.advance(300, 100, [replacement], []);

    expect(remainder).toHaveLength(2);
    expect(remainder.every(shot => shot.direction.x < -0.9 && shot.hits.length === 0)).toBe(true);
  });

  it('does not fire while stepping and stops briefly before aiming again', () => {
    const combat = new CompanionCombat([{ ...deployment(), weaponId: 'pistol' }], [position], exit);
    let sawMovement = false;
    for (let elapsed = 0; elapsed < 15000; elapsed += 1000 / 60) {
      const shots = combat.advance(1000 / 60, 100, [target], []);
      if (combat.getPoses()[0].moving) {
        sawMovement = true;
        expect(shots).toEqual([]);
      }
    }
    expect(sawMovement).toBe(true);
  });

  it('keeps small movements inside the defense area and clear of furniture', () => {
    const area = { x: 170, y: 150, width: 100, height: 100 };
    const furniture = { x: 218, y: 150, width: 20, height: 100, blocksHitscan: true };
    const combat = new CompanionCombat([deployment()], [position], exit, area);
    for (let elapsed = 0; elapsed < 20000; elapsed += 100) {
      combat.advance(100, 100, [], [furniture]);
      const { position: current } = combat.getPoses()[0];
      expect(current.x).toBeGreaterThanOrEqual(area.x + 18);
      expect(current.x).toBeLessThanOrEqual(200.000001);
      expect(current.y).toBeGreaterThanOrEqual(area.y + 18);
      expect(current.y).toBeLessThanOrEqual(area.y + area.height - 18);
    }
  });

  it('covers the room entrance without targeting concealed exterior zombies', () => {
    const layout = HAZARD_DEFENSE_CONFIG;
    const outside = { ...target, position: { x: 550, y: 640 } };
    const inside = { ...target, position: { x: 610, y: 640 } };
    const makeCombat = () => new CompanionCombat([deployment()], [layout.allyPositions[1]], exit,
      layout.combatArea, layout.interiorArea);

    expect(makeCombat().advance(2000, 100, [outside], layout.walls)).toEqual([]);
    expect(makeCombat().advance(2000, 100, [inside], layout.walls).length).toBeGreaterThan(0);
  });

  it('preserves movement, pauses and burst shots across frame partitions', () => {
    const makeCombat = () => new CompanionCombat([{ ...deployment(), weaponId: 'burstRifle' }], [position], exit);
    const whole = makeCombat();
    const split = makeCombat();

    const wholeShots = whole.advance(30000, 100, [target], []);
    const splitShots = Array.from({ length: 900 }, () => split.advance(1000 / 30, 100, [target], [])).flat();

    expect(splitShots).toEqual(wholeShots);
    expect(split.getPoses()).toEqual(whole.getPoses());
  });

  it('does not shoot distant zombies concealed outside the Hazard doorway', () => {
    const combat = new CompanionCombat([{ ...deployment(), weaponId: 'burstRifle' }],
      [HAZARD_DEFENSE_CONFIG.allyPositions[1]], exit);
    const hidden = { ...target, position: { x: 400, y: 640 } };

    expect(combat.advance(5000, 100, [hidden], HAZARD_DEFENSE_CONFIG.walls)).toEqual([]);
  });

  it('misses some shots at a distant target instead of aiming every bullet at its center', () => {
    const combat = new CompanionCombat([deployment()], [position], exit);
    const distant = { ...target, position: { x: 550, y: 200 } };

    const shots = combat.advance(30000, 100, [distant], []);

    expect(shots.some(shot => shot.hits.length > 0)).toBe(true);
    expect(shots.some(shot => shot.hits.length === 0)).toBe(true);
    expect(shots.some(shot => Math.abs(shot.direction.y) > 0.01)).toBe(true);
  });

  it('does not synchronize the aim errors of companions with the same weapon', () => {
    const combat = new CompanionCombat([deployment(), {
      ...deployment(), companion: { ...deployment().companion, id: 'second' },
    }], [position, position], exit);

    const shots = combat.advance(1300, 100, [target], []);

    expect(shots).toHaveLength(2);
    expect(shots[0].direction).not.toEqual(shots[1].direction);
  });

  it('acquires targets at the engagement limit but not beyond it', () => {
    const atLimit = { ...target, position: { x: position.x + COMPANION_CONFIG.engagementRange, y: position.y } };
    const beyondLimit = { ...atLimit, position: { ...atLimit.position, x: atLimit.position.x + 0.01 } };
    const allowed = new CompanionCombat([deployment()], [position], exit);
    const excluded = new CompanionCombat([deployment()], [position], exit);

    expect(allowed.advance(1300, 100, [atLimit], [])).toHaveLength(1);
    expect(excluded.advance(1300, 100, [beyondLimit], [])).toHaveLength(0);
  });

  it('limits missed rifle bullets to the engagement range', () => {
    const combat = new CompanionCombat([{ ...deployment(), weaponId: 'burstRifle' }], [position], exit);
    const distant = { ...target, position: { x: position.x + 350, y: position.y } };

    const shots = combat.advance(6000, 100, [distant], []);
    const misses = shots.filter(shot => !shot.hits.length);

    expect(misses.length).toBeGreaterThan(0);
    for (const shot of misses) {
      expect(Math.hypot(shot.endPoint.x - shot.origin.x, shot.endPoint.y - shot.origin.y))
        .toBeCloseTo(COMPANION_CONFIG.engagementRange);
    }
  });

  it('fires its weak pistol and reloads indefinitely without rendering', () => {
    const combat = new CompanionCombat([deployment()], [position], exit);
    const shots = combat.advance(180000, 100, [{ ...target, radius: 40 }], []);
    expect(shots.length).toBeGreaterThan(34);
    expect(shots.every(shot => shot.hits[0]?.damage === 10)).toBe(true);
    expect(combat.getFledIds()).toEqual([]);
  });
  it('produces the same attacks across frame partitions', () => {
    const whole = new CompanionCombat([deployment()], [position], exit);
    const split = new CompanionCombat([deployment()], [position], exit);
    const shots = whole.advance(6000, 100, [target], []);
    const splitShots = Array.from({ length: 60 }, () => split.advance(100, 100, [target], [])).flat();
    expect(splitShots).toEqual(shots);
  });
  it('refuses shots through walls', () => {
    const combat = new CompanionCombat([deployment()], [position], exit);
    expect(combat.advance(5000, 100, [target], [{ x: 140, y: 0, width: 20, height: 400, blocksHitscan: true }])).toEqual([]);
  });
  it('stops firing when fleeing and never re-enters combat', () => {
    const combat = new CompanionCombat([deployment()], [position], exit);
    expect(combat.advance(1300, 10, [target], []).length).toBeGreaterThan(0);
    expect(combat.advance(4000, 9.99, [target], [])).toEqual([]);
    expect(combat.getPoses()[0].state).toBe('left');
    expect(combat.getFledIds()).toEqual(['ally']);
    expect(combat.advance(4000, 100, [target], [])).toEqual([]);
  });
  it('lets maximum courage stay until collapse and minimum courage flee immediately', () => {
    const loyal = new CompanionCombat([deployment(100)], [position], exit);
    loyal.advance(100, 0.1, [], []);
    expect(loyal.getFledIds()).toEqual([]);
    loyal.advance(100, 0, [], []);
    expect(loyal.getFledIds()).toEqual(['ally']);
    const fearful = new CompanionCombat([deployment(0)], [position], exit);
    expect(fearful.advance(100, 100, [target], [])).toEqual([]);
    expect(fearful.getFledIds()).toEqual(['ally']);
  });
  it('uses assigned weapon damage instead of the personal pistol', () => {
    const ally = { ...deployment(), weaponId: 'doubleBarrelShotgun' as const };
    const combat = new CompanionCombat([ally], [position], exit);
    const shots = combat.advance(1300, 100, [target], []);
    expect(shots).toHaveLength(8);
    expect(shots.some(shot => shot.hits.some(hit => hit.damage === 16))).toBe(true);
  });

  it('reports the remaining retreat distance until the companion reaches the exit', () => {
    const combat = new CompanionCombat([deployment(0)], [position], exit);
    expect(combat.getPoses()[0].distanceToExit).toBeCloseTo(300);

    combat.advance(1000, 100, [], []);
    expect(combat.getPoses()[0]).toMatchObject({ state: 'fleeing' });
    expect(combat.getPoses()[0].distanceToExit).toBeCloseTo(40);

    combat.advance(3000, 100, [], []);
    expect(combat.getPoses()[0]).toMatchObject({ state: 'left', distanceToExit: 0 });
  });
});
