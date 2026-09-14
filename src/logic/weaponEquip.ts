import { WEAPON_EQUIP_CONFIG } from '../config/weaponEquipConfig';
import { resolveArmPose } from './armPose';
import type { Vector2 } from './hitscan';
import type { SidearmHandPose } from './playerVisual';
import type { WeaponId } from './weapon';

export interface EquippedWeaponPose extends SidearmHandPose {
  weaponPosition: Vector2;
  weaponRotation: number;
}

export function advanceWeaponEquip(elapsedMs: number | null, deltaMs: number, weaponId: WeaponId): number | null {
  if (elapsedMs === null || !Number.isFinite(deltaMs) || deltaMs <= 0) return elapsedMs;
  const next = elapsedMs + deltaMs;
  return next >= WEAPON_EQUIP_CONFIG[weaponId].durationMs ? null : next;
}

/** Move the grip and weapon as one rigid object; keep the shoulders anchored. */
export function resolveWeaponEquipPose(
  ready: EquippedWeaponPose,
  shoulders: { leftY: number; rightY: number },
  weaponId: WeaponId,
  elapsedMs: number | null,
): EquippedWeaponPose & { alpha: number; progress: number } {
  const config = WEAPON_EQUIP_CONFIG[weaponId];
  if (elapsedMs === null || elapsedMs >= config.durationMs) return { ...ready, alpha: 1, progress: 1 };
  const progress = Math.max(0, Number.isFinite(elapsedMs) ? elapsedMs / config.durationMs : 0);
  const smooth = (t: number) => t * t * (3 - 2 * t);
  const lift = smooth(Math.min(1, progress / 0.85));
  const turn = smooth(progress);
  const weaponRotation = config.startRotation + (ready.weaponRotation - config.startRotation) * turn;
  const rotation = weaponRotation - ready.weaponRotation;
  const startY = weaponId === 'burstRifle' || weaponId === 'doubleBarrelShotgun' ? -4 : 12;
  const desiredGrip = {
    x: 4 + (ready.rightHand.x - 4) * lift,
    y: startY + (ready.rightHand.y - startY) * lift,
  };
  const move = (point: Vector2): Vector2 => ({
    x: desiredGrip.x + (point.x - ready.rightHand.x) * Math.cos(rotation) - (point.y - ready.rightHand.y) * Math.sin(rotation),
    y: desiredGrip.y + (point.x - ready.rightHand.x) * Math.sin(rotation) + (point.y - ready.rightHand.y) * Math.cos(rotation),
  });
  const solve = (side: 'left' | 'right', target: Vector2) => {
    const shoulder = { x: 2, y: shoulders[`${side}Y`] };
    const elbow = ready[`${side}Elbow`];
    const hand = ready[`${side}Hand`];
    const cross = (hand.x - shoulder.x) * (elbow.y - shoulder.y)
      - (hand.y - shoulder.y) * (elbow.x - shoulder.x);
    return resolveArmPose(shoulder, target,
      Math.max(0.01, Math.hypot(elbow.x - shoulder.x, elbow.y - shoulder.y)),
      Math.max(0.01, Math.hypot(hand.x - elbow.x, hand.y - elbow.y)),
      Math.abs(cross) < 1e-6 ? (side === 'left' ? -1 : 1) : cross < 0 ? -1 : 1);
  };
  const right = solve('right', desiredGrip);
  // Keep the weapon attached even when the grip target lies beyond the arm's reach.
  desiredGrip.x = right.hand.x;
  desiredGrip.y = right.hand.y;
  const left = solve('left', weaponId === 'policeBaton'
    ? { x: ready.leftHand.x, y: ready.leftHand.y } : move(ready.leftHand));
  return {
    leftHand: left.hand, leftElbow: left.elbow,
    rightHand: right.hand, rightElbow: right.elbow,
    weaponPosition: move(ready.weaponPosition), weaponRotation,
    alpha: Math.min(1, progress / 0.2), progress,
  };
}
