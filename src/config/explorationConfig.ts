import type { SearchLocation } from '../types/exploration';

export const EXPLORATION_HOURS = 12;
export const INITIAL_BARRICADE = 50;
export const REPAIR_PERCENT_PER_PERSON_HOUR = 5;
export const HAZARD_LOCATIONS: readonly SearchLocation[] = [
  { id: 'grocery', name: 'Grocery Store', x: 0.24, y: 0.22, searchHours: 4,
    lootTable: { food: { chance: 0.9, min: 2, max: 7 }, ammo: { chance: 0.15, min: 1, max: 2 } }, searched: false },
  { id: 'gas', name: 'Gas Station', x: 0.72, y: 0.22, searchHours: 3,
    lootTable: { food: { chance: 0.4, min: 1, max: 3 }, fuel: { chance: 0.8, min: 1, max: 5 } }, searched: false },
  { id: 'pharmacy', name: 'Pharmacy', x: 0.46, y: 0.43, searchHours: 2,
    lootTable: { food: { chance: 0.3, min: 1, max: 2 } }, searched: false },
  { id: 'house-a', name: 'Residential House A', x: 0.2, y: 0.65, searchHours: 2,
    lootTable: { food: { chance: 0.6, min: 1, max: 4 }, ammo: { chance: 0.2, min: 1, max: 3 } }, searched: false },
  { id: 'house-b', name: 'Residential House B', x: 0.49, y: 0.8, searchHours: 2,
    lootTable: { food: { chance: 0.5, min: 1, max: 3 }, ammo: { chance: 0.25, min: 1, max: 2 } }, searched: false },
  { id: 'police', name: 'Police Station', x: 0.78, y: 0.61, searchHours: 5,
    lootTable: { food: { chance: 0.2, min: 1, max: 2 }, ammo: { chance: 0.9, min: 3, max: 9 } }, searched: false },
];
