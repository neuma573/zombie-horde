import type { WeaponId } from '../logic/weapon';
import { COMPANION_CONFIG, COMPANION_WEAPON_CACHES } from '../config/companionConfig';
import { CompanionSystem } from './CompanionSystem';
import { searchEfficiency } from '../logic/companion';
import { allocateTeamRepair } from '../logic/repairAllocation';
import { EXPLORATION_HOURS, HAZARD_LOCATIONS, INITIAL_BARRICADE, REPAIR_PERCENT_PER_PERSON_HOUR } from '../config/explorationConfig';
import { rollLoot } from '../logic/exploration';
import { RESOURCE_KEYS, type DayResult, type ExplorationPlanBlock, type ExplorationState, type SearchBlock, type SearchLocation, type SearchResult } from '../types/exploration';

export class ExplorationSystem {
  private state: ExplorationState;
  private readonly searchTeams = new Map<string, string[]>();
  private readonly companionRepair = new Map<string, number>();
  private teamRepairHours: number | null = null;
  private nightAmmo: number | null = null;
  private recoveredWeapons: WeaponId[] = [];
  private readonly completedHours = new Map<string, number>();
  private readonly completedRest = new Map<string, number>();
  private completedRepair = 0;

  constructor(
    locations: readonly SearchLocation[] = HAZARD_LOCATIONS,
    private readonly random: () => number = Math.random,
    readonly companions = new CompanionSystem(random),
  ) {
    this.state = {
      day: 1,
      remainingHours: EXPLORATION_HOURS,
      plannedLocationIds: [], repairHours: 0, barricade: INITIAL_BARRICADE, confirmed: false,
      resources: { food: 0, ammo: 0, fuel: 0 },
      locations: structuredClone([...locations]),
    };
  }

  getRecoveredWeapons(): WeaponId[] { return [...this.recoveredWeapons]; }

  getState(): ExplorationState { return structuredClone({ ...this.state, repairHours: this.getRepairHours() }); }

  completeNight(day: number, barricade: number, fledIds: readonly string[] = []): boolean {
    if (day !== this.state.day || !Number.isFinite(barricade) || barricade < 0 || barricade > 100) return false;
    this.companions.surviveNight(fledIds);
    this.companions.beginDay();
    this.recoveredWeapons = [];
    this.searchTeams.clear();
    this.completedHours.clear();
    this.completedRest.clear();
    this.completedRepair = 0;
    this.companionRepair.clear();
    this.teamRepairHours = null;
    this.nightAmmo = null;
    this.state.day += 1;
    this.state.barricade = barricade;
    this.state.remainingHours = EXPLORATION_HOURS;
    this.state.plannedLocationIds = [];
    this.state.repairHours = 0;
    this.state.confirmed = false;
    return true;
  }

  getParticipants(locationId: string): string[] {
    if (!this.searchTeams.has(locationId) && this.state.locations.some(location => location.id === locationId && location.searched)) return ['player'];
    return [...(this.searchTeams.get(locationId) ?? ['player', ...this.getAvailableCompanions().map(ally => ally.id)])];
  }

  getAvailableCompanions() {
    return this.companions.getActive().filter(ally => ally.joinedDay < this.state.day);
  }

  getSearchHours(locationId: string, participants: readonly string[] = this.getParticipants(locationId)): number {
    if (this.completedHours.has(locationId)) return this.completedHours.get(locationId)!;
    const location = this.state.locations.find(location => location.id === locationId);
    if (!location) return 0;
    const roster = this.companions.getActive();
    const efficiency = participants.reduce((sum, id) => {
      const ally = roster.find(ally => ally.id === id);
      return sum + (id === 'player' ? 1 : ally ? searchEfficiency(ally.courage) : 0);
    }, 0);
    return Math.ceil(location.searchHours / Math.max(0.5, efficiency) * 2) / 2;
  }

  getRepairHours(id = 'player'): number {
    if (this.teamRepairHours !== null && !this.state.confirmed) {
      return this.getSchedule().find(person => person.id === id)?.repairHours ?? 0;
    }
    return id === 'player' ? this.state.repairHours : this.companionRepair.get(id) ?? 0;
  }

  getTeamRepairHours(): number { return this.teamRepairHours ?? 0; }

  getTeamRepairSummary(hours = this.teamRepairHours) {
    if (this.state.confirmed) {
      const repairs = [this.state.repairHours, ...this.companionRepair.values()].filter(value => value > 0);
      return { workers: repairs.length, totalHours: repairs.reduce((sum, value) => sum + value, 0) };
    }
    const schedule = this.getSchedule(undefined, undefined, hours);
    const workers = schedule.filter(person => person.repairHours > 0);
    return { workers: workers.length, totalHours: workers.reduce((sum, person) => sum + person.repairHours, 0) };
  }

  setTeamRepairHours(hours: number): boolean {
    if (this.state.day === 1 || this.state.confirmed || !Number.isInteger(hours) || hours < 0 || hours > EXPLORATION_HOURS) return false;
    this.teamRepairHours = hours;
    return true;
  }

  getUnallocatedHours(id = 'player'): number {
    if (this.state.confirmed) return id === 'player' ? this.state.remainingHours : this.completedRest.get(id) ?? 0;
    return this.getSchedule().find(person => person.id === id)?.restHours ?? 0;
  }

  /** Time available for another task after current searches and repairs; excludes waiting rest. */
  getAvailableHours(id = 'player'): number {
    if (this.state.confirmed || (id !== 'player' && !this.getAvailableCompanions().some(ally => ally.id === id))) return 0;
    const person = this.getSchedule().find(person => person.id === id);
    return person ? Math.max(0, EXPLORATION_HOURS - person.requiredHours) : 0;
  }

  getProjectedRepair(): number {
    if (this.state.confirmed) return this.completedRepair;
    const hours = this.getTeamRepairSummary().totalHours;
    return Math.min(100 - this.state.barricade, hours * REPAIR_PERCENT_PER_PERSON_HOUR);
  }

  setParticipants(locationId: string, ids: readonly string[]): boolean {
    if (this.getParticipantChangeBlock(locationId, ids)) return false;
    this.searchTeams.set(locationId, [...ids]);
    return true;
  }

  getParticipantChangeBlock(locationId: string, ids: readonly string[]): ExplorationPlanBlock | null {
    const blocked = this.getEditableLocationBlock(locationId);
    if (blocked) return blocked;
    if (!ids.length) return { reason: 'NO SEARCHERS' };
    const available = new Set(['player', ...this.getAvailableCompanions().map(ally => ally.id)]);
    if (new Set(ids).size !== ids.length || ids.some(id => !available.has(id))) return { reason: 'INVALID SEARCHERS' };
    return this.state.plannedLocationIds.includes(locationId)
      ? this.getScheduleBlock(this.state.plannedLocationIds, { locationId, ids }) : null;
  }

  private getSchedule(locationIds = this.state.plannedLocationIds,
    changedTeam?: { locationId: string; ids: readonly string[] }, teamHours = this.teamRepairHours) {
    // Joint searches start when every selected participant is free. Repairs use
    // each person's remaining time after their searches; waiting is rest.
    const elapsed = EXPLORATION_HOURS - this.state.remainingHours;
    const availableAt = new Map<string, number>([['player', elapsed]]);
    const workingHours = new Map<string, number>([['player', elapsed]]);
    for (const locationId of locationIds) {
      const ids = changedTeam?.locationId === locationId ? changedTeam.ids : this.getParticipants(locationId);
      const hours = this.getSearchHours(locationId, ids);
      const finish = Math.max(...ids.map(id => availableAt.get(id) ?? 0)) + hours;
      for (const id of ids) {
        availableAt.set(id, finish);
        workingHours.set(id, (workingHours.get(id) ?? 0) + hours);
      }
    }
    const ids = ['player', ...this.companions.getActive().map(ally => ally.id)];
    const teamRepair = teamHours !== null && !this.state.confirmed ? allocateTeamRepair(teamHours,
      ['player', ...this.getAvailableCompanions().map(ally => ally.id)].map(id => ({
        id, availableHours: Math.max(0, EXPLORATION_HOURS - (availableAt.get(id) ?? 0)),
      })), 100 - this.state.barricade) : null;
    return ids.map(id => {
      const finish = availableAt.get(id) ?? 0;
      const work = workingHours.get(id) ?? 0;
      const repairHours = teamRepair ? teamRepair.get(id) ?? 0
        : id === 'player' ? this.state.repairHours : this.companionRepair.get(id) ?? 0;
      return { id, repairHours, requiredHours: finish + repairHours, waitingHours: finish - work,
        restHours: EXPLORATION_HOURS - work - repairHours };
    });
  }

  private getScheduleBlock(locationIds = this.state.plannedLocationIds,
    changedTeam?: { locationId: string; ids: readonly string[] }): ExplorationPlanBlock | null {
    // Name the bottleneck first, ahead of people delayed by that same person's work.
    const conflict = this.getSchedule(locationIds, changedTeam)
      .filter(person => person.requiredHours > EXPLORATION_HOURS)
      .sort((a, b) => b.requiredHours - a.requiredHours || a.waitingHours - b.waitingHours)[0];
    return conflict ? { reason: 'NOT ENOUGH TIME', personId: conflict.id,
      requiredHours: conflict.requiredHours, availableHours: EXPLORATION_HOURS, waitingHours: conflict.waitingHours } : null;
  }

  private fitsSchedule(): boolean {
    return this.getScheduleBlock() === null;
  }

  canConfirmPlan(): boolean {
    return this.state.day > 1 && !this.state.confirmed && (this.state.plannedLocationIds.length > 0
      || this.getTeamRepairSummary().totalHours > 0
      || this.companions.getActive().length > 0);
  }

  beginNight(companionCount: number): boolean {
    if (this.nightAmmo !== null || !Number.isInteger(companionCount) || companionCount < 0
      || companionCount > this.companions.getActive().length || companionCount * COMPANION_CONFIG.ammoPerCompanion > this.state.resources.ammo) return false;
    this.nightAmmo = this.state.resources.ammo;
    this.state.resources.ammo -= companionCount * COMPANION_CONFIG.ammoPerCompanion;
    return true;
  }

  retryNight(): void {
    if (this.nightAmmo !== null) this.state.resources.ammo = this.nightAmmo;
    this.nightAmmo = null;
  }

  toggleLocation(id: string): boolean {
    if (this.state.day === 1 || this.state.confirmed) return false;
    if (this.state.plannedLocationIds.includes(id)) {
      this.state.plannedLocationIds = this.state.plannedLocationIds.filter(value => value !== id);
      this.searchTeams.delete(id);
      return true;
    }
    if (!this.canPlanLocation(id)) return false;
    this.searchTeams.set(id, this.getParticipants(id));
    this.state.plannedLocationIds.push(id);
    return true;
  }

  canPlanLocation(id: string): boolean {
    return this.getLocationPlanBlock(id) === null;
  }

  private getEditableLocationBlock(id: string): ExplorationPlanBlock | null {
    if (this.state.day === 1) return { reason: 'SURVIVE THE FIRST NIGHT' };
    if (this.state.confirmed) return { reason: 'DAY COMPLETE' };
    const location = this.state.locations.find(location => location.id === id);
    if (!location) return { reason: 'UNKNOWN LOCATION' };
    return location.searched ? { reason: 'SEARCHED' } : null;
  }

  getLocationPlanBlock(id: string): ExplorationPlanBlock | null {
    const blocked = this.getEditableLocationBlock(id);
    if (blocked) return blocked;
    if (this.state.plannedLocationIds.includes(id)) return { reason: 'PLAN ACTIVE' };
    return this.getScheduleBlock([...this.state.plannedLocationIds, id]);
  }

  setRepairHours(hours: number, id = 'player'): boolean {
    // Legacy explicit allocations are retained for system callers; the UI uses team allocation.
    if (this.teamRepairHours !== null) return false;
    if (this.state.day === 1 || this.state.confirmed || !Number.isInteger(hours) || hours < 0 ||
      hours > this.getUnallocatedHours(id) + this.getRepairHours(id)) return false;
    if (id !== 'player' && !this.companions.getActive().some(ally => ally.id === id && ally.joinedDay < this.state.day)) return false;
    const otherHours = this.state.repairHours + [...this.companionRepair.values()].reduce((a, b) => a + b, 0) - this.getRepairHours(id);
    if (hours + otherHours > Math.ceil((100 - this.state.barricade) / REPAIR_PERCENT_PER_PERSON_HOUR)) return false;
    const previous = this.getRepairHours(id);
    if (id === 'player') this.state.repairHours = hours;
    else this.companionRepair.set(id, hours);
    if (!this.fitsSchedule()) {
      if (id === 'player') this.state.repairHours = previous;
      else this.companionRepair.set(id, previous);
      return false;
    }
    return true;
  }

  confirmPlan(): DayResult | null {
    if (!this.canConfirmPlan()) return null;
    const locationIds = [...this.state.plannedLocationIds];
    const locations = locationIds.map(id => this.state.locations.find(location => location.id === id)!);
    if (this.getUnallocatedHours() < 0 || !this.fitsSchedule() || locations.some(location => location.searched)) return null;
    const workers = ['player', ...this.getAvailableCompanions().map(ally => ally.id)];
    const requestedRepair = new Map(workers.map(id => [id, this.getRepairHours(id)]));
    const elapsed = EXPLORATION_HOURS - this.state.remainingHours;
    const availableAt = new Map<string, number>([['player', elapsed]]);
    const worked = new Map<string, number>();
    const completedIds: string[] = [];
    const loot = { food: 0, ammo: 0, fuel: 0 };
    for (const location of locations) {
      const active = new Set(this.companions.getActive().map(ally => ally.id));
      const participants = this.getParticipants(location.id).filter(id => id === 'player' || active.has(id));
      // A dead team cannot visit later sites or deliver supplies.
      if (!participants.length) continue;
      const hours = this.getSearchHours(location.id, participants);
      const finish = Math.max(...participants.map(id => availableAt.get(id) ?? 0)) + hours;
      // Later searches use the surviving team, not a duration frozen before casualties.
      if (finish > EXPLORATION_HOURS) continue;
      this.completedHours.set(location.id, hours);
      for (const id of participants) {
        availableAt.set(id, finish);
        worked.set(id, (worked.get(id) ?? 0) + hours);
      }
      const found = rollLoot(location.lootTable, this.random);
      const returned = this.companions.resolveSearch(this.state.day, location.id,
        participants.filter(id => id !== 'player'), participants.length);
      if (returned) {
        for (const key of RESOURCE_KEYS) loot[key] += found[key];
        const weapon = COMPANION_WEAPON_CACHES[location.id];
        if (weapon) this.recoveredWeapons.push(weapon);
      }
      location.searched = true;
      completedIds.push(location.id);
    }
    const living = new Set(this.companions.getActive().map(ally => ally.id));
    const teamRepair = this.teamRepairHours !== null ? allocateTeamRepair(this.teamRepairHours,
      workers.filter(id => id === 'player' || living.has(id)).map(id => ({
        id, availableHours: Math.max(0, EXPLORATION_HOURS - (availableAt.get(id) ?? 0)),
      })), 100 - this.state.barricade) : null;
    let repairHours = 0;
    for (const id of workers) {
      const hours = id === 'player' || living.has(id)
        ? teamRepair ? teamRepair.get(id) ?? 0
          : Math.min(requestedRepair.get(id) ?? 0, Math.max(0, EXPLORATION_HOURS - (availableAt.get(id) ?? 0))) : 0;
      repairHours += hours;
      if (id === 'player') this.state.repairHours = hours;
      else {
        this.companionRepair.set(id, hours);
        const rest = EXPLORATION_HOURS - (worked.get(id) ?? 0) - hours;
        this.completedRest.set(id, rest);
        this.companions.rest(id, rest);
      }
    }
    const repaired = Math.min(100 - this.state.barricade, REPAIR_PERCENT_PER_PERSON_HOUR * repairHours);
    this.completedRepair = repaired;
    const hoursSpent = (worked.get('player') ?? 0) + this.state.repairHours;
    for (const key of RESOURCE_KEYS) this.state.resources[key] += loot[key];
    this.state.remainingHours -= hoursSpent;
    this.state.barricade += repaired;
    this.state.confirmed = true;
    return { ok: true, locationIds: completedIds, loot, hoursSpent, repaired };
  }

  getSearchBlock(locationId: string): SearchBlock | null {
    if (this.state.day === 1) return 'SURVIVE THE FIRST NIGHT';
    if (this.state.confirmed) return 'DAY COMPLETE';
    const location = this.state.locations.find(({ id }) => id === locationId);
    if (!location) return 'UNKNOWN LOCATION';
    if (location.searched) return 'SEARCHED';
    // Resolve allocations together through confirmPlan; direct searches must not invalidate them.
    if (this.state.plannedLocationIds.length > 0 || this.getTeamRepairSummary().totalHours > 0) return 'PLAN ACTIVE';
    return location.searchHours > this.state.remainingHours ? 'NOT ENOUGH TIME' : null;
  }

  canSearch(locationId: string): boolean { return this.getSearchBlock(locationId) === null; }

  hasPlannableLocations(): boolean {
    return this.state.locations.some(location => this.canPlanLocation(location.id));
  }

  hasSearchableLocations(): boolean {
    return this.state.locations.some(({ id }) => this.canSearch(id));
  }

  search(locationId: string): SearchResult {
    const reason = this.getSearchBlock(locationId);
    if (reason) return { ok: false, reason };
    const location = this.state.locations.find(({ id }) => id === locationId)!;
    this.searchTeams.set(locationId, ['player']);
    this.completedHours.set(locationId, location.searchHours);
    const loot = rollLoot(location.lootTable, this.random);
    this.state.remainingHours -= location.searchHours;
    for (const key of RESOURCE_KEYS) this.state.resources[key] += loot[key];
    location.searched = true;
    const weapon = COMPANION_WEAPON_CACHES[locationId];
    if (weapon) this.recoveredWeapons.push(weapon);
    this.companions.resolveSearch(this.state.day, locationId, [], 1);
    return { ok: true, locationId, hoursSpent: location.searchHours,
      remainingHours: this.state.remainingHours, loot };
  }
}
