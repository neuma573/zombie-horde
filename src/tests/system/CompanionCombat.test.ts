import { describe, expect, it } from 'vitest';
import { CompanionCombat } from '../../systems/CompanionCombat';
import { createCompanion } from '../../logic/companion';
import type { CompanionDeployment } from '../../types/companion';

const position = { x: 200, y: 200 };
const exit = { x: 500, y: 200 };
const target = { id: 'z', position: { x: 100, y: 200 }, radius: 18, health: 10000 };
function deployment(courage = 50): CompanionDeployment {
  return { companion: { ...createCompanion('ally', 2, () => 0), courage }, weaponId: null };
}
describe('CompanionCombat', () => {
  it('fires its weak pistol and reloads indefinitely without rendering', () => {
    const combat = new CompanionCombat([deployment()], [position], exit);
    const shots = combat.advance(90000, 100, [target], []);
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
    expect(combat.advance(100, 10, [target], []).length).toBeGreaterThan(0);
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
    const shots = combat.advance(20, 100, [target], []);
    expect(shots).toHaveLength(8);
    expect(shots.some(shot => shot.hits.some(hit => hit.damage === 16))).toBe(true);
  });
});
