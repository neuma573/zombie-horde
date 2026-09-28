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
  private readonly completedWork = new Map<string, number>();
  private readonly completedTeams = new Map<string, string[]>();
  private readonly companionRepair = new Map<string, number>();
  private teamRepairHours = 0;
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
    this.completedTeams.clear();
    this.completedWork.clear();
    this.completedHours.clear();
    this.completedRest.clear();
    this.completedRepair = 0;
    this.companionRepair.clear();
    this.teamRepairHours = 0;
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
    if (!this.completedTeams.has(locationId) && this.state.locations.some(location => location.id === locationId && location.searched)) return ['player'];
    return [...(this.completedTeams.get(locationId) ?? ['player', ...this.getAvailableCompanions().map(ally => ally.id)])];
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
    if (!this.state.confirmed) return this.getSchedule().repair.get(id) ?? 0;
    return id === 'player' ? this.state.repairHours : this.companionRepair.get(id) ?? 0;
  }

  getTeamRepairHours(): number { return this.getRepairHours(); }

  getTeamRepairSummary(hours = this.teamRepairHours) {
    const values = this.state.confirmed
      ? [this.state.repairHours, ...this.companionRepair.values()]
      : [...this.getSchedule(undefined, hours).repair.values()];
    const repairs = values.filter(value => value > 0);
    return { workers: repairs.length, totalHours: repairs.reduce((sum, value) => sum + value, 0) };
  }

  setTeamRepairHours(hours: number): boolean {
    if (this.state.day === 1 || this.state.confirmed || !Number.isInteger(hours) || hours < 0) return false;
    const remaining = EXPLORATION_HOURS - this.getSchedule().searchHours;
    if (hours > remaining) return false;
    this.teamRepairHours = this.getSchedule(undefined, hours).repair.get('player') ?? 0;
    return true;
  }

  /** The player leads every search, so their free time is the shared daily budget. */
  getUnallocatedHours(id = 'player'): number {
    if (this.state.confirmed) return id === 'player' ? this.state.remainingHours : this.completedRest.get(id) ?? 0;
    const schedule = this.getSchedule();
    if (id === 'player') return EXPLORATION_HOURS - schedule.searchHours - this.getRepairHours();
    if (!this.getAvailableCompanions().some(ally => ally.id === id)) return 0;
    return EXPLORATION_HOURS - (schedule.worked.get(id) ?? 0) - (schedule.repair.get(id) ?? 0);
  }

  getProjectedRepair(): number {
    if (this.state.confirmed) return this.completedRepair;
    const hours = this.getTeamRepairSummary().totalHours;
    return Math.min(100 - this.state.barricade, hours * REPAIR_PERCENT_PER_PERSON_HOUR);
  }

  private getSchedule(locationIds = this.state.plannedLocationIds,
    repairHours = this.teamRepairHours) {
    let searchHours = EXPLORATION_HOURS - this.state.remainingHours;
    const worked = new Map(this.completedWork);
    for (const locationId of locationIds) {
      const ids = this.getParticipants(locationId);
      const hours = this.getSearchHours(locationId, ids);
      searchHours += hours;
      for (const id of ids) worked.set(id, (worked.get(id) ?? 0) + hours);
    }
    const repair = this.allocateRepair(repairHours, searchHours,
      ['player', ...this.getAvailableCompanions().map(ally => ally.id)]);
    return { searchHours, worked, repair };
  }

  private allocateRepair(hours: number, searchHours: number, workers: readonly string[]) {
    return allocateTeamRepair(hours, workers.map(id => ({
      id, availableHours: Math.max(0, EXPLORATION_HOURS - searchHours),
    })), 100 - this.state.barricade);
  }

  private getScheduleBlock(locationIds = this.state.plannedLocationIds): ExplorationPlanBlock | null {
    const requiredHours = this.getSchedule(locationIds).searchHours + this.teamRepairHours;
    return requiredHours > EXPLORATION_HOURS
      ? { reason: 'NOT ENOUGH TIME', requiredHours, availableHours: EXPLORATION_HOURS } : null;
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
      return true;
    }
    if (!this.canPlanLocation(id)) return false;
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

  confirmPlan(): DayResult | null {
    if (!this.canConfirmPlan()) return null;
    const locationIds = [...this.state.plannedLocationIds];
    const locations = locationIds.map(id => this.state.locations.find(location => location.id === id)!);
    if (this.getUnallocatedHours() < 0 || !this.fitsSchedule() || locations.some(location => location.searched)) return null;
    const workers = ['player', ...this.getAvailableCompanions().map(ally => ally.id)];
    const elapsed = EXPLORATION_HOURS - this.state.remainingHours;
    let searchHours = elapsed;
    const worked = new Map(this.completedWork);
    const completedIds: string[] = [];
    const loot = { food: 0, ammo: 0, fuel: 0 };
    for (const location of locations) {
      const active = new Set(this.companions.getActive().map(ally => ally.id));
      const participants = this.getParticipants(location.id).filter(id => id === 'player' || active.has(id));
      const hours = this.getSearchHours(location.id, participants);
      const finish = searchHours + hours;
      // Later searches use the surviving team, not a duration frozen before casualties.
      if (finish > EXPLORATION_HOURS) continue;
      this.completedTeams.set(location.id, participants);
      this.completedHours.set(location.id, hours);
      searchHours = finish;
      for (const id of participants) {
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
    const teamRepair = this.allocateRepair(this.teamRepairHours, searchHours,
      workers.filter(id => id === 'player' || living.has(id)));
    let repairHours = 0;
    for (const id of workers) {
      const hours = teamRepair.get(id) ?? 0;
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
    const hoursSpent = searchHours - elapsed + this.state.repairHours;
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
    return this.getSearchHours(locationId) > this.state.remainingHours ? 'NOT ENOUGH TIME' : null;
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
    const participants = this.getParticipants(locationId);
    const hours = this.getSearchHours(locationId);
    this.completedTeams.set(locationId, participants);
    this.completedHours.set(locationId, hours);
    for (const id of participants) this.completedWork.set(id, (this.completedWork.get(id) ?? 0) + hours);
    const loot = rollLoot(location.lootTable, this.random);
    this.state.remainingHours -= hours;
    for (const key of RESOURCE_KEYS) this.state.resources[key] += loot[key];
    location.searched = true;
    const weapon = COMPANION_WEAPON_CACHES[locationId];
    if (weapon) this.recoveredWeapons.push(weapon);
    this.companions.resolveSearch(this.state.day, locationId, participants.filter(id => id !== 'player'), participants.length);
    return { ok: true, locationId, hoursSpent: hours,
      remainingHours: this.state.remainingHours, loot };
  }
}
