export const RESOURCE_KEYS = ['food', 'ammo', 'fuel'] as const;
export type Resource = typeof RESOURCE_KEYS[number];
export type Resources = Record<Resource, number>;
export interface LootRule { chance: number; min: number; max: number }
export type LootTable = Partial<Record<Resource, LootRule>>;
export interface SearchLocation {
  id: string;
  name: string;
  /** Normalized coordinates within the map image. */
  x: number;
  y: number;
  searchHours: number;
  lootTable: LootTable;
  searched: boolean;
}
export interface ExplorationState {
  day: number;
  remainingHours: number;
  plannedLocationIds: string[];
  repairHours: number;
  barricade: number;
  confirmed: boolean;
  resources: Resources;
  locations: SearchLocation[];
}
export type SearchBlock = 'UNKNOWN LOCATION' | 'SEARCHED' | 'NOT ENOUGH TIME' | 'DAY COMPLETE' | 'PLAN ACTIVE';
export type SearchResult = {
  ok: true;
  locationId: string;
  hoursSpent: number;
  remainingHours: number;
  loot: Resources;
} | { ok: false; reason: SearchBlock };

export interface DayResult {
  ok: true;
  locationIds: string[];
  loot: Resources;
  hoursSpent: number;
  repaired: number;
}
