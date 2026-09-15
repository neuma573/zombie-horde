import { HUMANOID_VISUAL } from '../config/characterVisualConfig';
import { MELEE_MOTION } from '../config/meleeMotionConfig';
import { resolveArmPose } from './armPose';
import type { OneHandedMeleePose } from './playerVisual';

/** Adapt the shared animation to the appearance without changing its weapon aim. */
export function resolveMeleeDisplayPose(
  source: OneHandedMeleePose,
  shoulders: { leftY: number; rightY: number },
  swingProgress: number | null,
  isShoving: boolean,
): OneHandedMeleePose {
  const smooth = (t: number) => t * t * (3 - 2 * t);
  const idleWeight = isShoving ? 0 : swingProgress === null ? 1
    : swingProgress < MELEE_MOTION.windupProgress
      ? 1 - smooth(Math.max(0, swingProgress) / MELEE_MOTION.windupProgress)
      : swingProgress > MELEE_MOTION.followThroughProgress
        ? smooth(Math.min(1, (swingProgress - MELEE_MOTION.followThroughProgress)
          / (1 - MELEE_MOTION.followThroughProgress))) : 0;
  const pose = { ...source,
    leftHand: { x: source.leftHand.x - 3 * idleWeight, y: source.leftHand.y + 6 * idleWeight },
    rightHand: { x: source.rightHand.x + idleWeight, y: source.rightHand.y - 3 * idleWeight },
  };
  // Translate a two-handed grip together when extending it beyond the arms' reach.
  // Independently clamping each hand would separate the support hand from the baton.
  if (isShoving) {
    const reach = MELEE_MOTION.upperArmLength + MELEE_MOTION.forearmLength - 0.01;
    const maximumX = (handY: number, shoulderY: number) => (
      2 + Math.sqrt(Math.max(0, reach * reach - (handY - shoulderY) ** 2))
    );
    const retreat = Math.max(0,
      pose.leftHand.x - maximumX(pose.leftHand.y, shoulders.leftY),
      pose.rightHand.x - maximumX(pose.rightHand.y, shoulders.rightY),
    );
    pose.leftHand = { ...pose.leftHand, x: pose.leftHand.x - retreat };
    pose.rightHand = { ...pose.rightHand, x: pose.rightHand.x - retreat };
  }
  const windupWeight = (swingProgress ?? 0) < MELEE_MOTION.windupProgress
    ? (swingProgress ?? 0) / MELEE_MOTION.windupProgress
    : Math.max(0, (MELEE_MOTION.impactProgress - (swingProgress ?? 0))
      / (MELEE_MOTION.impactProgress - MELEE_MOTION.windupProgress));
  // A relaxed guard projects mostly forward. Only the attacking arm folds for windup.
  const guardFlexion = 0.55;
  const left = resolveArmPose(
    { x: 2, y: shoulders.leftY },
    pose.leftHand, MELEE_MOTION.upperArmLength, MELEE_MOTION.forearmLength, -1,
    isShoving ? Math.PI : guardFlexion + idleWeight * 0.35,
  );
  const right = resolveArmPose(
    { x: 2, y: shoulders.rightY },
    pose.rightHand, MELEE_MOTION.upperArmLength, MELEE_MOTION.forearmLength, 1,
    isShoving ? Math.PI : guardFlexion + windupWeight * 1.1,
  );
  // Use one reference wrist orientation for both appearances. Shoulder width only
  // changes the arm solution, never the weapon's intended aim.
  const reference = resolveArmPose(
    { x: 2, y: HUMANOID_VISUAL.shoulderY }, pose.rightHand,
    MELEE_MOTION.upperArmLength, MELEE_MOTION.forearmLength, 1,
    guardFlexion + windupWeight * 1.1,
  );
  const forearmAngle = Math.atan2(reference.hand.y - reference.elbow.y, reference.hand.x - reference.elbow.x);
  // A two-handed crosswise shove has a different grip; constrain the one-handed wrist only.
  const weaponRotation = isShoving ? pose.weaponRotation
    : forearmAngle + Math.max(-0.65, Math.min(0.65, pose.weaponRotation - forearmAngle));
  return { ...pose, leftHand: left.hand, leftElbow: left.elbow,
    rightHand: right.hand, rightElbow: right.elbow, weaponPosition: right.hand, weaponRotation };
}
