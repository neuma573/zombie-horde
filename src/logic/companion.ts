import { COMPANION_CONFIG as C, COMPANION_NAMES } from '../config/companionConfig';
import type { Companion } from '../types/companion';

export function clampCourage(value: number): number {
  return Math.max(C.minimumCourage, Math.min(C.maximumCourage, Number.isFinite(value) ? value : 0));
}
export function createCompanion(id: string, day: number, random: () => number): Companion {
  const pick = <T>(values: readonly T[]): T => values[Math.min(values.length - 1, Math.max(0, Math.floor(random() * values.length)))];
  const gender = random() < 0.5 ? 'male' : 'female';
  return {
    id, gender, firstName: pick(COMPANION_NAMES[gender]), lastName: pick(COMPANION_NAMES.surnames),
    courage: C.initialMinimumCourage + Math.min(C.initialMaximumCourage - C.initialMinimumCourage,
      Math.max(0, Math.floor(random() * (C.initialMaximumCourage - C.initialMinimumCourage + 1)))),
    joinedDay: day, status: 'active',
  };
}
export function searchEfficiency(courage: number): number {
  return C.minimumSearchEfficiency + (1 - C.minimumSearchEfficiency) * Math.min(1, clampCourage(courage) / C.normalCourage);
}
export function companionDeathChance(courage: number, people: number): number {
  return (C.baseDeathChance + C.lowCourageDeathBonus * (1 - clampCourage(courage) / 100)) / Math.max(1, people);
}
export function shouldCompanionFlee(courage: number, integrity: number): boolean {
  const value = clampCourage(courage);
  if (integrity <= 0 || value === 0) return true;
  // Normal courage holds until below 10%; maximum courage holds until collapse.
  const threshold = value < C.normalCourage
    ? 10 + 90 * (1 - value / C.normalCourage)
    : 10 * (1 - (value - C.normalCourage) / (C.maximumCourage - C.normalCourage));
  return integrity < threshold;
}
