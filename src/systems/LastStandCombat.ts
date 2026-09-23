import { LAST_STAND_COMBAT_CONFIG, LAST_STAND_TIME_CONFIG } from '../config/lastStandCombatConfig';
import { advanceGameTime, createGameTimeState } from '../logic/gameTime';
import { constrainToArea, defenseSectorPhase, segmentAreaEntry } from '../logic/defenseSector';
import { movingCircleContactWindow, resolveContactDamage } from '../logic/contactDamage';
import type { Vector2 } from '../logic/hitscan';
import type { CityDefenseConfig, NightCombatPhase } from '../types/lastStandCombat';

interface DefenseZombie {
  sectorId: string;
  enteredDefenseArea: boolean;
  cooldownRemainingMs: number;
  windupRemainingMs: number | null;
}
export interface CombatMotion {
  start: Vector2;
  end: Vector2;
  radius: number;
}
export interface DefenseZombieMotion extends CombatMotion { id: string }

/** Owns night rules only. Movement, weapons, damage to zombies and effects stay shared. */
export class LastStandCombat {
  private phase: NightCombatPhase = 'PREPARING';
  private elapsedMs = 0;
  private time = createGameTimeState(LAST_STAND_TIME_CONFIG);
  private readonly integrity = new Map<string, number>();
  private readonly zombies = new Map<string, DefenseZombie>();
  readonly durationMs = ((LAST_STAND_COMBAT_CONFIG.endHour
    - LAST_STAND_COMBAT_CONFIG.startHour + 24) % 24)
    * LAST_STAND_TIME_CONFIG.realMillisecondsPerGameHour;

  constructor(readonly layout: CityDefenseConfig, initialIntegrity: Readonly<Record<string, number>>) {
    for (const sector of layout.sectors) {
      const value = initialIntegrity[sector.barricadeId];
      if (!Number.isFinite(value)) throw new Error(`Missing integrity: ${sector.barricadeId}`);
      this.integrity.set(sector.id, Math.max(0, Math.min(LAST_STAND_COMBAT_CONFIG.maxIntegrity, value)));
    }
  }

  start(): void { if (this.phase === 'PREPARING') this.phase = 'COMBAT'; }
  getPhase(): NightCombatPhase { return this.phase; }
  getTime(): { minuteOfDay: number } { return { ...this.time }; }
  getRemainingMs(): number { return Math.max(0, this.durationMs - this.elapsedMs); }
  getSectors() {
    return this.layout.sectors.map(config => ({
      ...config,
      integrity: this.integrity.get(config.id)!,
      phase: defenseSectorPhase(this.integrity.get(config.id)!, LAST_STAND_COMBAT_CONFIG.dangerThreshold),
    }));
  }

  registerZombie(id: string, sectorId: string): void {
    if (!this.integrity.has(sectorId)) throw new Error(`Unknown defense sector: ${sectorId}`);
    this.zombies.set(id, { sectorId, enteredDefenseArea: false, cooldownRemainingMs: 0, windupRemainingMs: null });
  }

  getTarget(id: string, position: Vector2, player: Vector2): Vector2 {
    const zombie = this.zombies.get(id);
    if (!zombie) throw new Error(`Unassigned defense zombie: ${id}`);
    const sector = this.layout.sectors.find(item => item.id === zombie.sectorId)!;
    if (this.integrity.get(sector.id)! > 0) return constrainToArea(position, sector.barricade);
    if (zombie.enteredDefenseArea) return { x: player.x, y: player.y };
    return {
      x: sector.breachArea.x + sector.breachArea.width / 2,
      y: sector.breachArea.y + sector.breachArea.height / 2,
    };
  }

  getPursuitSpeed(id: string): number | undefined {
    const zombie = this.zombies.get(id);
    return zombie && this.integrity.get(zombie.sectorId) === 0
      ? LAST_STAND_COMBAT_CONFIG.breachedPursuitSpeed : undefined;
  }

  getAttackState(id: string) {
    const state = this.zombies.get(id);
    return { cooldownRemainingMs: state?.cooldownRemainingMs ?? 0, windupRemainingMs: state?.windupRemainingMs ?? null };
  }

  getMovementObstacles() {
    return [...this.layout.walls, ...(this.layout.fixtures ?? []), ...this.getSectors()
      .filter(sector => sector.phase !== 'BREACHED').map(sector => sector.barricade)];
  }

  resolveContacts(player: CombatMotion, motions: readonly DefenseZombieMotion[], deltaMs: number): boolean {
    if (this.phase !== 'COMBAT' || !Number.isFinite(deltaMs) || deltaMs <= 0) return false;
    const liveIds = new Set(motions.map(motion => motion.id));
    for (const id of this.zombies.keys()) if (!liveIds.has(id)) this.zombies.delete(id);
    for (const sector of this.getSectors()) {
      const attackers = motions.filter(motion => this.zombies.get(motion.id)?.sectorId === sector.id);
      if (sector.phase !== 'BREACHED') {
        const result = resolveContactDamage({
          health: sector.integrity, isAlive: true, invulnerabilityMs: 0, invulnerabilityRemainingMs: 0,
        }, attackers.map(motion => {
          const state = this.zombies.get(motion.id)!;
          const target = constrainToArea(motion.end, sector.barricade);
          return {
            damage: LAST_STAND_COMBAT_CONFIG.barricadeDamage,
            attackIntervalMs: LAST_STAND_COMBAT_CONFIG.attackIntervalMs,
            windupMs: LAST_STAND_COMBAT_CONFIG.attackWindupMs,
            cooldownRemainingMs: state.cooldownRemainingMs,
            windupRemainingMs: state.windupRemainingMs,
            contactWindow: movingCircleContactWindow(
              { ...motion, radius: motion.radius + LAST_STAND_COMBAT_CONFIG.attackReach },
              { start: target, end: target, radius: 0 }, deltaMs,
            ),
          };
        }), deltaMs);
        this.integrity.set(sector.id, result.health);
        attackers.forEach((motion, index) => {
          const state = this.zombies.get(motion.id)!;
          state.cooldownRemainingMs = result.attackerCooldownsMs[index];
          state.windupRemainingMs = result.attackerWindupsRemainingMs[index];
        });
        // Building entry is allowed; defense-area entry still requires a breached barricade.
        continue;
      }
      for (const motion of attackers) {
        const state = this.zombies.get(motion.id)!;
        state.windupRemainingMs = null;
        state.cooldownRemainingMs = 0;
        const entry = state.enteredDefenseArea ? 0 : segmentAreaEntry(motion.start, motion.end, sector.breachArea);
        if (entry !== null) state.enteredDefenseArea = true;
        const contact = movingCircleContactWindow(player, motion, deltaMs);
        if (entry !== null && contact && contact.endMs >= entry * deltaMs) {
          this.phase = 'DEFEAT';
          return true;
        }
      }
    }
    return false;
  }

  advanceTime(deltaMs: number, playerAlive: boolean): void {
    if (this.phase !== 'COMBAT') return;
    if (!playerAlive) { this.phase = 'DEFEAT'; return; }
    if (!Number.isFinite(deltaMs) || deltaMs <= 0) return;
    const step = Math.min(deltaMs, this.getRemainingMs());
    this.elapsedMs = Math.min(this.durationMs, this.elapsedMs + step);
    this.time = advanceGameTime(this.time, step, LAST_STAND_TIME_CONFIG);
    if (this.getRemainingMs() < 1e-7) {
      this.time = { minuteOfDay: LAST_STAND_COMBAT_CONFIG.endHour * 60 };
      this.phase = 'VICTORY';
    }
  }
}
