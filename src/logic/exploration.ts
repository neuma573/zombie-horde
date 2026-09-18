import { RESOURCE_KEYS, type LootRule, type LootTable, type Resources } from '../types/exploration';

export function resourceExpectation(rule?: LootRule): 'NONE' | 'LOW' | 'MEDIUM' | 'HIGH' {
  if (!rule || rule.chance <= 0 || rule.max <= 0) return 'NONE';
  if (rule.chance < 0.5) return 'LOW';
  return rule.chance < 0.75 ? 'MEDIUM' : 'HIGH';
}

/** Random sources follow Math.random's [0, 1) contract. Amount bounds are inclusive. */
export function rollLoot(table: LootTable, random: () => number): Resources {
  const loot: Resources = { food: 0, ammo: 0, fuel: 0 };
  for (const key of RESOURCE_KEYS) {
    const rule = table[key];
    if (rule && random() < rule.chance) {
      loot[key] = rule.min + Math.floor(random() * (rule.max - rule.min + 1));
    }
  }
  return loot;
}
