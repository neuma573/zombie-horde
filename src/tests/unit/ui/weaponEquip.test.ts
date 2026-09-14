import { describe, expect, it } from 'vitest';
import { WEAPON_EQUIP_CONFIG } from '../../../config/weaponEquipConfig';
import { advanceWeaponEquip, resolveWeaponEquipPose, type EquippedWeaponPose } from '../../../logic/weaponEquip';
import { resolveSidearmHandPose, resolveSidearmPose, resolveOneHandedMeleePose, RIFLE_VISUAL } from '../../../logic/playerVisual';
import { resolveMeleeDisplayPose } from '../../../logic/meleeDisplayPose';
import type { WeaponId } from '../../../logic/weapon';

const weapons: WeaponId[] = ['pistol', 'policeBaton', 'burstRifle', 'doubleBarrelShotgun'];
const shoulders = { leftY: -14.5, rightY: 14.5 };
function readyPose(id: WeaponId): EquippedWeaponPose {
  if (id === 'policeBaton') return resolveMeleeDisplayPose(resolveOneHandedMeleePose(null, 360), shoulders, null, false);
  if (id === 'pistol') {
    const pose = resolveSidearmPose(false, 0);
    return { ...resolveSidearmHandPose(pose, shoulders), weaponPosition: { x: pose.x, y: pose.y }, weaponRotation: pose.rotation };
  }
  return { leftHand: RIFLE_VISUAL.leftHand, rightHand: RIFLE_VISUAL.rightHand,
    leftElbow: { x: 8, y: -13 }, rightElbow: { x: -1, y: 13 },
    weaponPosition: { x: 0, y: 9 }, weaponRotation: 0 };
}

describe('weapon drawing animation', () => {
  it.each(weapons)('preserves arm lengths and keeps the grip attached while drawing %s', id => {
    const ready = readyPose(id);
    const gripOffset = Math.hypot(ready.weaponPosition.x - ready.rightHand.x, ready.weaponPosition.y - ready.rightHand.y);
    for (const progress of [0, 0.1, 0.3, 0.5, 0.8, 0.99]) {
      const pose = resolveWeaponEquipPose(ready, shoulders, id, progress * WEAPON_EQUIP_CONFIG[id].durationMs);
      expect(Math.hypot(pose.weaponPosition.x - pose.rightHand.x, pose.weaponPosition.y - pose.rightHand.y)).toBeCloseTo(gripOffset);
      for (const side of ['left', 'right'] as const) {
        const elbow = pose[`${side}Elbow`], hand = pose[`${side}Hand`];
        const restElbow = ready[`${side}Elbow`], restHand = ready[`${side}Hand`];
        expect(Math.hypot(elbow.x - 2, elbow.y - shoulders[`${side}Y`])).toBeCloseTo(Math.hypot(restElbow.x - 2, restElbow.y - shoulders[`${side}Y`]));
        expect(Math.hypot(hand.x - elbow.x, hand.y - elbow.y)).toBeCloseTo(Math.hypot(restHand.x - restElbow.x, restHand.y - restElbow.y));
      }
    }
  });
  it.each(weapons)('finishes at the exact existing ready pose for %s', id => {
    const ready = readyPose(id);
    expect(resolveWeaponEquipPose(ready, shoulders, id, WEAPON_EQUIP_CONFIG[id].durationMs)).toEqual({ ...ready, alpha: 1, progress: 1 });
    expect(resolveWeaponEquipPose(ready, shoulders, id, null)).toEqual({ ...ready, alpha: 1, progress: 1 });
  });
  it.each(weapons)('advances independently of frame subdivision for %s', id => {
    let elapsed: number | null = 0;
    for (let index = 0; index < 10; index++) elapsed = advanceWeaponEquip(elapsed, 10, id);
    expect(elapsed).toBe(advanceWeaponEquip(0, 100, id));
    expect(advanceWeaponEquip(elapsed, 1000, id)).toBeNull();
    expect(advanceWeaponEquip(null, 1000, id)).toBeNull();
  });
  it.each([0, -1, NaN, Infinity])('ignores invalid animation delta %s', delta => {
    expect(advanceWeaponEquip(30, delta, 'pistol')).toBe(30);
  });
});
