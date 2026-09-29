import { getCompanionVisualAlpha } from '../logic/companionVisual';
import Phaser from 'phaser';
import { Player } from '../entities/Player';
import type { CompanionCombat, CompanionShot } from '../systems/CompanionCombat';
import { constrainMuzzleToShotSegment } from '../logic/combatEffects';
import type { CombatEffects } from './CombatEffects';

/** Reuses survivor poses while keeping all targeting, damage and flight decisions in the system. */
export class CompanionCombatView {
  private readonly actors = new Map<string, Player>();
  constructor(scene: Phaser.Scene, combat: CompanionCombat, private readonly effects: CombatEffects) {
    for (const pose of combat.getPoses()) {
      const actor = new Player(scene, pose.position.x, pose.position.y, pose.gender === 'female' ? 'female-swat' : 'male-swat');
      actor.setWeaponVisual(pose.weaponId);
      actor.setAimDirection(pose.direction);
      actor.setAlpha(getCompanionVisualAlpha(pose.state, pose.distanceToExit));
      actor.setVisible(pose.state !== 'left');
      this.actors.set(pose.id, actor);
    }
  }
  update(combat: CompanionCombat, deltaMs: number): void {
    for (const pose of combat.getPoses()) {
      const actor = this.actors.get(pose.id)!;
      actor.setPosition(pose.position.x, pose.position.y);
      actor.setVisible(pose.state !== 'left');
      actor.setAlpha(getCompanionVisualAlpha(pose.state, pose.distanceToExit));
      actor.setAimDirection(pose.direction);
      actor.setReloadVisual(pose.reload.isReloading, pose.reload.normalized);
      actor.updateVisual(deltaMs, pose.moving);
      this.effects.updateMuzzlePosition(actor.getMuzzlePosition(), pose.id);
    }
  }
  shot(shot: CompanionShot): void {
    const actor = this.actors.get(shot.companionId);
    if (!actor) return;
    if (shot.melee) actor.triggerMeleeSwingVisual(shot.direction);
    else {
      actor.triggerRangedShotVisual(shot.direction);
      this.effects.playShot({
        origin: constrainMuzzleToShotSegment(shot.origin, actor.getMuzzlePosition(), shot.endPoint),
        endPoint: shot.endPoint, shooterId: shot.companionId,
      });
    }
  }
  destroy(): void { for (const actor of this.actors.values()) actor.destroy(); this.actors.clear(); }
}
