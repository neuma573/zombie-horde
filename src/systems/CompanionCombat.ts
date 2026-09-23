import { COMPANION_CONFIG, COMPANION_PISTOL } from '../config/companionConfig';
import { SIMULATION_CONFIG } from '../config/simulationConfig';
import { WEAPON_DEFINITIONS } from '../config/weaponConfig';
import { shouldCompanionFlee } from '../logic/companion';
import { consumeFixedSteps, createFixedStepState } from '../logic/fixedStep';
import { resolveHitscan, type HitscanBlocker, type Vector2 } from '../logic/hitscan';
import { resolveMeleeHits } from '../logic/meleeAttack';
import { moveWithinBounds } from '../logic/movement';
import { createPelletDirections } from '../logic/weapon';
import type { CompanionDeployment } from '../types/companion';
import { WeaponSystem } from './WeaponSystem';

export interface CompanionCombatTarget {
  id: string; position: Vector2; radius: number; health: number;
}
export interface CompanionShot {
  companionId: string; origin: Vector2; direction: Vector2; endPoint: Vector2;
  melee: boolean; hits: Array<{ id: string; damage: number }>;
}
interface Fighter {
  deployment: CompanionDeployment; position: Vector2; weapon: WeaponSystem;
  state: 'active' | 'fleeing' | 'left'; direction: Vector2; shots: number;
}

/** Fixed-step companion AI. Produces attacks and poses without Phaser or effects. */
export class CompanionCombat {
  private step = createFixedStepState();
  private readonly fighters: Fighter[];
  constructor(deployments: readonly CompanionDeployment[], positions: readonly Vector2[],
    private readonly exit: Vector2) {
    this.fighters = deployments.map((deployment, index) => ({
      deployment: structuredClone(deployment),
      position: { ...(positions[index] ?? positions[0] ?? exit) },
      weapon: new WeaponSystem(deployment.weaponId ? WEAPON_DEFINITIONS[deployment.weaponId] : COMPANION_PISTOL,
        undefined, { unlimitedReserve: true }),
      state: 'active', direction: { x: -1, y: 0 }, shots: 0,
    }));
  }
  getPoses() {
    return this.fighters.map(fighter => ({ id: fighter.deployment.companion.id,
      position: { ...fighter.position }, direction: { ...fighter.direction }, state: fighter.state,
      gender: fighter.deployment.companion.gender, weaponId: fighter.weapon.getDefinition().id,
      reload: fighter.weapon.getReloadProgress(),
    }));
  }
  getFledIds(): string[] {
    return this.fighters.filter(fighter => fighter.state !== 'active').map(fighter => fighter.deployment.companion.id);
  }
  advance(deltaMs: number, integrity: number, targets: readonly CompanionCombatTarget[],
    blockers: readonly HitscanBlocker[]): CompanionShot[] {
    const consumed = consumeFixedSteps(this.step, deltaMs, SIMULATION_CONFIG.fixedStepMs);
    this.step = consumed.state;
    const health = new Map(targets.map(target => [target.id, target.health]));
    const shots: CompanionShot[] = [];
    for (let step = 0; step < consumed.stepCount; step++) {
      for (const fighter of this.fighters) {
        if (fighter.state === 'active' && shouldCompanionFlee(fighter.deployment.companion.courage, integrity)) fighter.state = 'fleeing';
        if (fighter.state !== 'active') {
          if (fighter.state === 'left') continue;
          const distance = Math.hypot(this.exit.x - fighter.position.x, this.exit.y - fighter.position.y);
          const direction = { x: this.exit.x - fighter.position.x, y: this.exit.y - fighter.position.y };
          fighter.direction = direction;
          if (distance <= COMPANION_CONFIG.fleeSpeed * SIMULATION_CONFIG.fixedStepMs / 1000) {
            fighter.position = { ...this.exit }; fighter.state = 'left';
          } else fighter.position = moveWithinBounds(fighter.position, direction, COMPANION_CONFIG.fleeSpeed,
            SIMULATION_CONFIG.fixedStepMs, { width: Math.max(this.exit.x, fighter.position.x) + 100,
              height: Math.max(this.exit.y, fighter.position.y) + 100, padding: 0 });
          continue;
        }
        const definition = fighter.weapon.getDefinition();
        const available = targets.filter(target => (health.get(target.id) ?? 0) > 0)
          .filter(target => Math.hypot(target.position.x - fighter.position.x, target.position.y - fighter.position.y) <= definition.config.range)
          .sort((a, b) => Math.hypot(a.position.x - fighter.position.x, a.position.y - fighter.position.y)
            - Math.hypot(b.position.x - fighter.position.x, b.position.y - fighter.position.y));
        const target = available.find(target => resolveHitscan(fighter.position, {
          x: target.position.x - fighter.position.x, y: target.position.y - fighter.position.y,
        }, definition.config.range, [target], 1, blockers).hits.length > 0);
        const burst = fighter.weapon.updateBurst(SIMULATION_CONFIG.fixedStepMs);
        if (!target) continue;
        const distance = Math.hypot(target.position.x - fighter.position.x, target.position.y - fighter.position.y);
        fighter.direction = distance ? { x: (target.position.x - fighter.position.x) / distance,
          y: (target.position.y - fighter.position.y) / distance } : { x: -1, y: 0 };
        const count = burst.length + (fighter.weapon.fire() ? 1 : 0);
        for (let index = 0; index < count; index++) {
          const directions = createPelletDirections(fighter.direction, definition.config.pelletCount ?? 1,
            definition.config.pelletSpreadDegrees ?? 0, ++fighter.shots);
          for (const direction of directions) {
            const living = targets.filter(target => (health.get(target.id) ?? 0) > 0);
            const result = resolveHitscan(fighter.position, direction, definition.config.range, living, definition.config.maxTargets, blockers);
            const hits = definition.attackType === 'melee'
              ? resolveMeleeHits(fighter.position, direction, living, { range: definition.config.range,
                halfAngleRadians: definition.config.halfAngleRadians ?? 0, maxTargets: definition.config.maxTargets }, blockers)
                .map(hit => ({ id: hit.id, damage: definition.config.damage }))
              : result.hits.map(hit => ({ id: hit.targetId, damage: definition.config.damage }));
            for (const hit of hits) health.set(hit.id, Math.max(0, (health.get(hit.id) ?? 0) - hit.damage));
            shots.push({ companionId: fighter.deployment.companion.id, origin: { ...fighter.position },
              direction, endPoint: result.endPoint, melee: definition.attackType === 'melee', hits });
          }
        }
        if (definition.attackType !== 'melee' && fighter.weapon.getState().magazineAmmo === 0) fighter.weapon.reload();
      }
    }
    return shots;
  }
}
