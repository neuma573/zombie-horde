import { EXPLORATION_HOURS, HAZARD_LOCATIONS, INITIAL_BARRICADE, REPAIR_PERCENT_PER_PERSON_HOUR } from '../config/explorationConfig';
import { rollLoot } from '../logic/exploration';
import { RESOURCE_KEYS, type DayResult, type ExplorationState, type SearchBlock, type SearchLocation, type SearchResult } from '../types/exploration';

export class ExplorationSystem {
  private state: ExplorationState;

  constructor(
    locations: readonly SearchLocation[] = HAZARD_LOCATIONS,
    private readonly random: () => number = Math.random,
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

  getUnallocatedHours(): number {
    if (this.state.confirmed) return this.state.remainingHours;
    return this.state.remainingHours - this.state.repairHours - this.state.locations
      .filter(location => this.state.plannedLocationIds.includes(location.id))
      .reduce((hours, location) => hours + location.searchHours, 0);
  }

  toggleLocation(id: string): boolean {
    if (this.state.confirmed) return false;
    if (this.state.plannedLocationIds.includes(id)) {
      this.state.plannedLocationIds = this.state.plannedLocationIds.filter(value => value !== id);
      return true;
    }
    const location = this.state.locations.find(location => location.id === id);
    if (!location || location.searched || location.searchHours > this.getUnallocatedHours()) return false;
    this.state.plannedLocationIds.push(id);
    return true;
  }

  setRepairHours(hours: number): boolean {
    if (this.state.confirmed || !Number.isInteger(hours) || hours < 0 ||
      hours > this.getUnallocatedHours() + this.state.repairHours ||
      hours > Math.ceil((100 - this.state.barricade) / REPAIR_PERCENT_PER_PERSON_HOUR)) return false;
    this.state.repairHours = hours;
    return true;
  }

  confirmPlan(): DayResult | null {
    if (this.state.confirmed || (!this.state.plannedLocationIds.length && !this.state.repairHours)) return null;
    const locationIds = [...this.state.plannedLocationIds];
    const locations = locationIds.map(id => this.state.locations.find(location => location.id === id)!);
    if (this.getUnallocatedHours() < 0 || locations.some(location => location.searched)) return null;
    const loot = { food: 0, ammo: 0, fuel: 0 };
    for (const location of locations) {
      const found = rollLoot(location.lootTable, this.random);
      for (const key of RESOURCE_KEYS) loot[key] += found[key];
    }
    const hoursSpent = this.state.repairHours + locations.reduce((hours, location) => hours + location.searchHours, 0);
    const repaired = Math.min(100 - this.state.barricade, this.state.repairHours * REPAIR_PERCENT_PER_PERSON_HOUR);
    for (const location of locations) location.searched = true;
    for (const key of RESOURCE_KEYS) this.state.resources[key] += loot[key];
    this.state.remainingHours -= hoursSpent;
    this.state.barricade += repaired;
    this.state.confirmed = true;
    return { ok: true, locationIds, loot, hoursSpent, repaired };
  }

  getSearchBlock(locationId: string): SearchBlock | null {
    if (this.state.confirmed) return 'DAY COMPLETE';
    const location = this.state.locations.find(({ id }) => id === locationId);
    if (!location) return 'UNKNOWN LOCATION';
    if (location.searched) return 'SEARCHED';
    // Resolve allocations together through confirmPlan; direct searches must not invalidate them.
    if (this.state.plannedLocationIds.length > 0 || this.state.repairHours > 0) return 'PLAN ACTIVE';
    return location.searchHours > this.state.remainingHours ? 'NOT ENOUGH TIME' : null;
  }

  canSearch(locationId: string): boolean { return this.getSearchBlock(locationId) === null; }

  hasPlannableLocations(): boolean {
    if (this.state.confirmed) return false;
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
    return { ok: true, locationId, hoursSpent: location.searchHours,
      remainingHours: this.state.remainingHours, loot };
  }
}
