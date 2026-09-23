import type { WeaponId } from '../logic/weapon';
import { COMPANION_CONFIG, COMPANION_WEAPON_CACHES } from '../config/companionConfig';
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
  private recoveredWeapons: WeaponId[] = [];
  private readonly completedHours = new Map<string, number>();
  private readonly completedRest = new Map<string, number>();

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

  getState(): ExplorationState { return structuredClone(this.state); }

  completeNight(day: number, barricade: number, fledIds: readonly string[] = []): boolean {
    if (day !== this.state.day || !Number.isFinite(barricade) || barricade < 0 || barricade > 100) return false;
    this.companions.surviveNight(fledIds);
    this.companions.beginDay();
    this.recoveredWeapons = [];
    this.searchTeams.clear();
    this.completedHours.clear();
    this.completedRest.clear();
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
    if (this.completedHours.has(locationId)) return this.completedHours.get(locationId)!;
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
    if (this.state.confirmed) return id === 'player' ? this.state.remainingHours : this.completedRest.get(id) ?? 0;
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
    if ([...available].some(id => this.getUnallocatedHours(id) < 0) || !this.fitsSchedule()) {
      this.searchTeams.set(locationId, previous);
      return false;
    }
    return true;
  }

  private fitsSchedule(): boolean {
    // Joint searches start when every selected participant is free. Repairs use
    // each person's remaining time after their searches; waiting is rest.
    const availableAt = new Map<string, number>();
    for (const locationId of this.state.plannedLocationIds) {
      const ids = this.getParticipants(locationId);
      const finish = Math.max(...ids.map(id => availableAt.get(id) ?? 0)) + this.getSearchHours(locationId);
      for (const id of ids) availableAt.set(id, finish);
    }
    for (const id of ['player', ...this.companions.getActive().map(ally => ally.id)]) {
      const budget = id === 'player' ? this.state.remainingHours : EXPLORATION_HOURS;
      if ((availableAt.get(id) ?? 0) + this.getRepairHours(id) > budget) return false;
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
    const location = this.state.locations.find(location => location.id === id);
    if (!location || location.searched || location.searchHours > this.getUnallocatedHours()) return false;
    this.state.plannedLocationIds.push(id);
    if (!this.fitsSchedule()) { this.state.plannedLocationIds.pop(); return false; }
    return true;
  }

  setRepairHours(hours: number, id = 'player'): boolean {
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
    const rest = new Map(this.companions.getActive().map(ally => [ally.id, this.getUnallocatedHours(ally.id)]));
    const hoursSpent = this.state.remainingHours - this.getUnallocatedHours();
    for (const [id, hours] of rest) this.completedRest.set(id, hours);
    for (const location of locations) this.completedHours.set(location.id, this.getSearchHours(location.id));
    const completedIds: string[] = [];
    const loot = { food: 0, ammo: 0, fuel: 0 };
    for (const location of locations) {
      const active = new Set(this.companions.getActive().map(ally => ally.id));
      const participants = this.getParticipants(location.id).filter(id => id === 'player' || active.has(id));
      // A dead team cannot visit later sites or deliver supplies.
      if (!participants.length) continue;
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
    const repaired = Math.min(100 - this.state.barricade, REPAIR_PERCENT_PER_PERSON_HOUR
      * (this.state.repairHours + [...this.companionRepair].reduce((sum, [id, hours]) => sum + (living.has(id) ? hours : 0), 0)));
    for (const [id, hours] of rest) this.companions.rest(id, hours);
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
    const weapon = COMPANION_WEAPON_CACHES[locationId];
    if (weapon) this.recoveredWeapons.push(weapon);
    this.companions.resolveSearch(this.state.day, locationId, [], 1);
    return { ok: true, locationId, hoursSpent: location.searchHours,
      remainingHours: this.state.remainingHours, loot };
  }
}
