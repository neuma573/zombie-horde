import { EXPLORATION_HOURS, REPAIR_PERCENT_PER_PERSON_HOUR } from '../config/explorationConfig';

/** Allocate one-hour shifts fairly, stopping once the barricade can be fully repaired. */
export function allocateTeamRepair(hours: number, workers: readonly { id: string; availableHours: number }[],
  missingIntegrity: number): Map<string, number> {
  const allocations = new Map(workers.map(worker => [worker.id, 0]));
  let remaining = Math.ceil(Math.max(0, missingIntegrity) / REPAIR_PERCENT_PER_PERSON_HOUR);
  const shifts = Number.isFinite(hours) ? Math.min(EXPLORATION_HOURS, Math.max(0, Math.floor(hours))) : 0;
  for (let shift = 1; shift <= shifts && remaining > 0; shift++) {
    for (const worker of workers) {
      if (remaining <= 0) break;
      if (worker.availableHours < shift) continue;
      allocations.set(worker.id, shift);
      remaining--;
    }
  }
  return allocations;
}
