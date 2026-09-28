import { COMPANION_CONFIG, COMPANION_PISTOL } from '../config/companionConfig';
import { SIMULATION_CONFIG } from '../config/simulationConfig';
import { WEAPON_DEFINITIONS } from '../config/weaponConfig';
import { shouldCompanionFlee } from '../logic/companion';
import { companionDecision, turnCompanionAim } from '../logic/companionBehavior';
import { constrainToArea } from '../logic/defenseSector';
import { PLAYER_CONFIG } from '../config/playerConfig';
import { consumeFixedSteps, createFixedStepState } from '../logic/fixedStep';
import { resolveHitscan, type HitscanBlocker, type Vector2 } from '../logic/hitscan';
import { resolveMeleeHits } from '../logic/meleeAttack';
import { moveToward, moveWithinBounds } from '../logic/movement';
import { moveCircleWithObstacles, type RectangleObstacle } from '../logic/obstacleCollision';
import { applyWeaponRecoil, createPelletDirections } from '../logic/weapon';
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
  aimSeed: number;
  decisions: number;
  targetId: string | null;
  aimRemainingMs: number;
  pauseRemainingMs: number;
  burstRemainingMs: number;
  burstDirection: Vector2;
  home: Vector2;
  moveTarget: Vector2 | null;
  repositionWaitMs: number;
  moving: boolean;
}

/** Fixed-step companion AI. Produces attacks and poses without Phaser or effects. */
export class CompanionCombat {
  private step = createFixedStepState();
  private readonly fighters: Fighter[];
  constructor(deployments: readonly CompanionDeployment[], positions: readonly Vector2[],
    private readonly exit: Vector2, private readonly movementArea?: RectangleObstacle,
    private readonly engagementArea?: RectangleObstacle) {
    this.fighters = deployments.map((deployment, index) => ({
      deployment: structuredClone(deployment),
      position: { ...(positions[index] ?? positions[0] ?? exit) },
      weapon: new WeaponSystem(deployment.weaponId ? WEAPON_DEFINITIONS[deployment.weaponId] : COMPANION_PISTOL,
        undefined, { unlimitedReserve: true }),
      state: 'active', direction: { x: -1, y: 0 }, shots: 0, aimSeed: index + 1,
      decisions: 1, targetId: null, aimRemainingMs: 0, pauseRemainingMs: 0,
      burstRemainingMs: 0, burstDirection: { x: -1, y: 0 },
      home: { ...(positions[index] ?? positions[0] ?? exit) }, moveTarget: null, moving: false,
      repositionWaitMs: COMPANION_CONFIG.repositionWaitMs.min + companionDecision(index + 1, 0)
        * (COMPANION_CONFIG.repositionWaitMs.max - COMPANION_CONFIG.repositionWaitMs.min),
    }));
  }
  getPoses() {
    return this.fighters.map(fighter => ({ id: fighter.deployment.companion.id,
      position: { ...fighter.position }, direction: { ...fighter.direction }, state: fighter.state,
      distanceToExit: Math.hypot(this.exit.x - fighter.position.x, this.exit.y - fighter.position.y),
      gender: fighter.deployment.companion.gender, weaponId: fighter.weapon.getDefinition().id,
      moving: fighter.moving,
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
        fighter.moving = false;
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
          fighter.moving = fighter.state !== 'left';
          continue;
        }
        const definition = fighter.weapon.getDefinition();
        const range = Math.min(definition.config.range, COMPANION_CONFIG.engagementRange);
        const deltaMs = SIMULATION_CONFIG.fixedStepMs;
        fighter.pauseRemainingMs = Math.max(0, fighter.pauseRemainingMs - deltaMs);
        fighter.burstRemainingMs = Math.max(0, fighter.burstRemainingMs - deltaMs);
        fighter.repositionWaitMs = Math.max(0, fighter.repositionWaitMs - deltaMs);
        // A committed burst finishes along its original aim, even if that target dies.
        const burst = fighter.weapon.updateBurst(deltaMs);
        if (burst.length) fighter.burstRemainingMs = Math.max(fighter.burstRemainingMs, deltaMs);
        for (let shot = 0; shot < burst.length; shot++) {
          shots.push(...this.resolveShot(fighter, fighter.burstDirection, targets, health, blockers));
        }
        if (definition.attackType !== 'melee' && fighter.weapon.getState().magazineAmmo === 0
          && !fighter.weapon.getReloadProgress().isReloading) fighter.weapon.reload();
        const available = targets.filter(target => (health.get(target.id) ?? 0) > 0)
          .filter(target => !this.engagementArea || (
            target.position.x >= this.engagementArea.x && target.position.x <= this.engagementArea.x + this.engagementArea.width
            && target.position.y >= this.engagementArea.y && target.position.y <= this.engagementArea.y + this.engagementArea.height))
          .filter(target => Math.hypot(target.position.x - fighter.position.x, target.position.y - fighter.position.y) <= range)
          .filter(target => resolveHitscan(fighter.position, {
            x: target.position.x - fighter.position.x, y: target.position.y - fighter.position.y,
          }, range, [target], 1, blockers).hits.length > 0)
          .sort((a, b) => Math.hypot(a.position.x - fighter.position.x, a.position.y - fighter.position.y)
            - Math.hypot(b.position.x - fighter.position.x, b.position.y - fighter.position.y));
        const target = available.find(target => target.id === fighter.targetId) ?? available[0];
        const changedTarget = fighter.targetId !== (target?.id ?? null);
        if (changedTarget) {
          fighter.targetId = target?.id ?? null;
          fighter.aimRemainingMs = target ? this.waitTime(fighter, COMPANION_CONFIG.aimTimeMs) : 0;
        }
        this.reposition(fighter, blockers);
        if (fighter.burstRemainingMs > 1e-7) {
          fighter.direction = { ...fighter.burstDirection };
          continue;
        }
        if (!target) continue;
        const desired = { x: target.position.x - fighter.position.x, y: target.position.y - fighter.position.y };
        fighter.direction = turnCompanionAim(fighter.direction, desired, COMPANION_CONFIG.turnSpeedRadians * deltaMs / 1000);
        if (fighter.moving) continue;
        if (!changedTarget) fighter.aimRemainingMs = Math.max(0, fighter.aimRemainingMs - deltaMs);
        const distance = Math.hypot(desired.x, desired.y);
        const aligned = distance < 1e-8 || (fighter.direction.x * desired.x + fighter.direction.y * desired.y) / distance
          >= Math.cos(COMPANION_CONFIG.aimToleranceRadians);
        if (!aligned || fighter.aimRemainingMs > 1e-7 || fighter.pauseRemainingMs > 1e-7
          || !fighter.weapon.fire()) continue;
        fighter.burstDirection = { ...fighter.direction };
        fighter.burstRemainingMs = (definition.config.burstSize ?? 1) > 1
          ? ((definition.config.burstSize ?? 1) - 1) * (definition.config.burstIntervalMs ?? 0) : 0;
        const pause = fighter.deployment.weaponId ? COMPANION_CONFIG.triggerPauseMs : COMPANION_CONFIG.civilianPistolPauseMs;
        fighter.pauseRemainingMs = definition.config.fireIntervalMs + this.waitTime(fighter, pause);
        shots.push(...this.resolveShot(fighter, fighter.direction, targets, health, blockers));
      }
    }
    return shots;
  }

  private waitTime(fighter: Fighter, range: { min: number; max: number }): number {
    return range.min + companionDecision(fighter.aimSeed, fighter.decisions++) * (range.max - range.min);
  }

  private reposition(fighter: Fighter, blockers: readonly HitscanBlocker[]): void {
    if (fighter.burstRemainingMs > 1e-7) return;
    const radius = COMPANION_CONFIG.repositionRadius;
    const area = this.movementArea ?? {
      x: fighter.home.x - radius - PLAYER_CONFIG.radius, y: fighter.home.y - radius - PLAYER_CONFIG.radius,
      width: 2 * (radius + PLAYER_CONFIG.radius), height: 2 * (radius + PLAYER_CONFIG.radius),
    };
    if (!fighter.moveTarget && fighter.repositionWaitMs <= 1e-7
      && (!fighter.targetId || fighter.pauseRemainingMs > 500 || fighter.weapon.getReloadProgress().isReloading)) {
      const angle = companionDecision(fighter.aimSeed, fighter.decisions++) * Math.PI * 2;
      const distance = radius * (0.5 + companionDecision(fighter.aimSeed, fighter.decisions++) * 0.5);
      fighter.moveTarget = constrainToArea({
        x: fighter.home.x + Math.cos(angle) * distance, y: fighter.home.y + Math.sin(angle) * distance,
      }, area, PLAYER_CONFIG.radius);
      fighter.repositionWaitMs = this.waitTime(fighter, COMPANION_CONFIG.repositionWaitMs);
    }
    if (!fighter.moveTarget) return;
    const start = fighter.position;
    const desired = moveToward(start, fighter.moveTarget, COMPANION_CONFIG.repositionSpeed, SIMULATION_CONFIG.fixedStepMs);
    const next = moveCircleWithObstacles(start, desired, PLAYER_CONFIG.radius, blockers,
      { width: area.x + area.width, height: area.y + area.height, padding: PLAYER_CONFIG.radius });
    const overlapsAlly = this.fighters.some(other => other !== fighter && other.state !== 'left'
      && Math.hypot(next.x - other.position.x, next.y - other.position.y) < PLAYER_CONFIG.radius * 2);
    const leavesHome = Math.hypot(next.x - fighter.home.x, next.y - fighter.home.y) > radius + 1e-7;
    if (!overlapsAlly && !leavesHome) fighter.position = next;
    fighter.moving = Math.hypot(fighter.position.x - start.x, fighter.position.y - start.y) > 1e-7;
    if (!fighter.targetId && fighter.moving) fighter.direction = turnCompanionAim(fighter.direction,
      { x: next.x - start.x, y: next.y - start.y }, COMPANION_CONFIG.turnSpeedRadians * SIMULATION_CONFIG.fixedStepMs / 1000);
    fighter.aimRemainingMs = Math.max(fighter.aimRemainingMs, COMPANION_CONFIG.settleTimeMs);
    if (!fighter.moving || Math.hypot(fighter.moveTarget.x - next.x, fighter.moveTarget.y - next.y) < 1e-7) {
      fighter.moveTarget = null;
    }
  }

  private resolveShot(fighter: Fighter, aim: Vector2, targets: readonly CompanionCombatTarget[],
    health: Map<string, number>, blockers: readonly HitscanBlocker[]): CompanionShot[] {
    const definition = fighter.weapon.getDefinition();
    const range = Math.min(definition.config.range, COMPANION_CONFIG.engagementRange);
    fighter.shots += 1;
    const shotDirection = definition.attackType === 'melee' ? aim : applyWeaponRecoil(
      aim, Math.max(COMPANION_CONFIG.aimSpreadDegrees, definition.accuracy.baseSpreadDegrees),
      fighter.shots, fighter.aimSeed,
    );
    return createPelletDirections(shotDirection, definition.config.pelletCount ?? 1,
      definition.config.pelletSpreadDegrees ?? 0, fighter.shots ^ fighter.aimSeed).map(direction => {
      const living = targets.filter(target => (health.get(target.id) ?? 0) > 0);
      const result = resolveHitscan(fighter.position, direction, range, living, definition.config.maxTargets, blockers);
      const hits = definition.attackType === 'melee'
        ? resolveMeleeHits(fighter.position, direction, living, { range: definition.config.range,
          halfAngleRadians: definition.config.halfAngleRadians ?? 0, maxTargets: definition.config.maxTargets }, blockers)
          .map(hit => ({ id: hit.id, damage: definition.config.damage }))
        : result.hits.map(hit => ({ id: hit.targetId, damage: definition.config.damage }));
      for (const hit of hits) health.set(hit.id, Math.max(0, (health.get(hit.id) ?? 0) - hit.damage));
      return { companionId: fighter.deployment.companion.id, origin: { ...fighter.position },
        direction, endPoint: result.endPoint, melee: definition.attackType === 'melee', hits };
    });
  }
}
