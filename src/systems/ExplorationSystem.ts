import { CompanionSystem } from './CompanionSystem';
import { searchEfficiency } from '../logic/companion';
import { EXPLORATION_HOURS, HAZARD_LOCATIONS, INITIAL_BARRICADE, REPAIR_PERCENT_PER_PERSON_HOUR } from '../config/explorationConfig';
import { rollLoot } from '../logic/exploration';
import { RESOURCE_KEYS, type DayResult, type ExplorationState, type SearchBlock, type SearchLocation, type SearchResult } from '../types/exploration';

export class ExplorationSystem {
  private state: ExplorationState;
  private readonly searchTeams = new Map<string, string[]>();
  private readonly companionRepair = new Map<string, number>();
  private nightAmmo: number | null = null;

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

  getState(): ExplorationState { return structuredClone(this.state); }

  completeNight(day: number, barricade: number, fledIds: readonly string[] = []): boolean {
    if (day !== this.state.day || !Number.isFinite(barricade) || barricade < 0 || barricade > 100) return false;
    this.companions.surviveNight(fledIds);
    this.companions.beginDay();
    this.searchTeams.clear();
    this.companionRepair.clear();
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
    return [...(this.searchTeams.get(locationId) ?? ['player'])];
  }

  getSearchHours(locationId: string): number {
    const location = this.state.locations.find(location => location.id === locationId);
    if (!location) return 0;
    const roster = this.companions.getActive();
    const efficiency = this.getParticipants(locationId).reduce((sum, id) => {
      const ally = roster.find(ally => ally.id === id);
      return sum + (id === 'player' ? 1 : ally ? searchEfficiency(ally.courage) : 0);
    }, 0);
    return Math.ceil(location.searchHours / Math.max(0.5, efficiency) * 2) / 2;
  }

  getRepairHours(id = 'player'): number {
    return id === 'player' ? this.state.repairHours : this.companionRepair.get(id) ?? 0;
  }

  getUnallocatedHours(id = 'player'): number {
    if (this.state.confirmed && id === 'player') return this.state.remainingHours;
    return (id === 'player' ? this.state.remainingHours : EXPLORATION_HOURS)
      - this.getRepairHours(id) - this.state.plannedLocationIds
        .filter(locationId => this.getParticipants(locationId).includes(id))
        .reduce((hours, locationId) => hours + this.getSearchHours(locationId), 0);
  }

  getProjectedRepair(): number {
    const hours = this.state.repairHours + [...this.companionRepair.values()].reduce((sum, value) => sum + value, 0);
    return Math.min(100 - this.state.barricade, hours * REPAIR_PERCENT_PER_PERSON_HOUR);
  }

  setParticipants(locationId: string, ids: readonly string[]): boolean {
    if (this.state.confirmed || this.state.day === 1 || !this.state.plannedLocationIds.includes(locationId)
      || !ids.length || new Set(ids).size !== ids.length) return false;
    const available = new Set(['player', ...this.companions.getActive()
      .filter(ally => ally.joinedDay < this.state.day).map(ally => ally.id)]);
    if (ids.some(id => !available.has(id))) return false;
    const previous = this.getParticipants(locationId);
    this.searchTeams.set(locationId, [...ids]);
    if ([...available].some(id => this.getUnallocatedHours(id) < 0)) {
      this.searchTeams.set(locationId, previous);
      return false;
    }
    return true;
  }

  canConfirmPlan(): boolean {
    return this.state.day > 1 && !this.state.confirmed && (this.state.plannedLocationIds.length > 0
      || this.state.repairHours > 0 || [...this.companionRepair.values()].some(hours => hours > 0)
      || this.companions.getActive().length > 0);
  }

  beginNight(companionCount: number): boolean {
    if (this.nightAmmo !== null || !Number.isInteger(companionCount) || companionCount < 0
      || companionCount > this.companions.getActive().length || companionCount > this.state.resources.ammo) return false;
    this.nightAmmo = this.state.resources.ammo;
    this.state.resources.ammo -= companionCount;
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
    const location = this.state.locations.find(location => location.id === id);
    if (!location || location.searched || location.searchHours > this.getUnallocatedHours()) return false;
    this.state.plannedLocationIds.push(id);
    return true;
  }

  setRepairHours(hours: number, id = 'player'): boolean {
    if (this.state.day === 1 || this.state.confirmed || !Number.isInteger(hours) || hours < 0 ||
      hours > this.getUnallocatedHours(id) + this.getRepairHours(id)) return false;
    if (id !== 'player' && !this.companions.getActive().some(ally => ally.id === id && ally.joinedDay < this.state.day)) return false;
    const otherHours = this.state.repairHours + [...this.companionRepair.values()].reduce((a, b) => a + b, 0) - this.getRepairHours(id);
    if (hours + otherHours > Math.ceil((100 - this.state.barricade) / REPAIR_PERCENT_PER_PERSON_HOUR)) return false;
    if (id === 'player') this.state.repairHours = hours;
    else this.companionRepair.set(id, hours);
    return true;
  }

  confirmPlan(): DayResult | null {
    if (!this.canConfirmPlan()) return null;
    const locationIds = [...this.state.plannedLocationIds];
    const locations = locationIds.map(id => this.state.locations.find(location => location.id === id)!);
    if (this.getUnallocatedHours() < 0 || locations.some(location => location.searched)) return null;
    const rest = new Map(this.companions.getActive().map(ally => [ally.id, this.getUnallocatedHours(ally.id)]));
    const hoursSpent = this.state.remainingHours - this.getUnallocatedHours();
    const repaired = this.getProjectedRepair();
    const loot = { food: 0, ammo: 0, fuel: 0 };
    for (const location of locations) {
      const found = rollLoot(location.lootTable, this.random);
      for (const key of RESOURCE_KEYS) loot[key] += found[key];
    }
    for (const location of locations) {
      const participants = this.getParticipants(location.id);
      this.companions.resolveSearch(this.state.day, location.id, participants.filter(id => id !== 'player'), participants.length);
    }
    for (const [id, hours] of rest) this.companions.rest(id, hours);
    for (const location of locations) location.searched = true;
    for (const key of RESOURCE_KEYS) this.state.resources[key] += loot[key];
    this.state.remainingHours -= hoursSpent;
    this.state.barricade += repaired;
    this.state.confirmed = true;
    return { ok: true, locationIds, loot, hoursSpent, repaired };
  }

  getSearchBlock(locationId: string): SearchBlock | null {
    if (this.state.day === 1) return 'SURVIVE THE FIRST NIGHT';
    if (this.state.confirmed) return 'DAY COMPLETE';
    const location = this.state.locations.find(({ id }) => id === locationId);
    if (!location) return 'UNKNOWN LOCATION';
    if (location.searched) return 'SEARCHED';
    // Resolve allocations together through confirmPlan; direct searches must not invalidate them.
    if (this.state.plannedLocationIds.length > 0 || this.state.repairHours > 0
      || [...this.companionRepair.values()].some(hours => hours > 0)) return 'PLAN ACTIVE';
    return location.searchHours > this.state.remainingHours ? 'NOT ENOUGH TIME' : null;
  }

  canSearch(locationId: string): boolean { return this.getSearchBlock(locationId) === null; }

  hasPlannableLocations(): boolean {
    if (this.state.day === 1 || this.state.confirmed) return false;
    const available = this.getUnallocatedHours();
    return this.state.locations.some(location => !location.searched &&
      !this.state.plannedLocationIds.includes(location.id) && location.searchHours <= available);
  }

  hasSearchableLocations(): boolean {
    return this.state.locations.some(({ id }) => this.canSearch(id));
  }

  search(locationId: string): SearchResult {
    const reason = this.getSearchBlock(locationId);
    if (reason) return { ok: false, reason };
    const location = this.state.locations.find(({ id }) => id === locationId)!;
    const loot = rollLoot(location.lootTable, this.random);
    this.state.remainingHours -= location.searchHours;
    for (const key of RESOURCE_KEYS) this.state.resources[key] += loot[key];
    location.searched = true;
    this.companions.resolveSearch(this.state.day, locationId, [], 1);
    return { ok: true, locationId, hoursSpent: location.searchHours,
      remainingHours: this.state.remainingHours, loot };
  }
}
