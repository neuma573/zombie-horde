import type { Vector2 } from '../logic/hitscan';

export type PlayerAction = {
  type: 'fire';
  aimDirection: Vector2;
} | {
  type: 'reload';
} | {
  type: 'selectWeaponSlot';
  slot: 0 | 1;
} | {
  type: 'shove';
  aimDirection: Vector2;
} | {
  type: 'pickupWeapon';
  pickupId: number;
};

export interface QueuedPlayerAction {
  action: PlayerAction;
  requestedAtSimulationMs: number;
}

interface PendingPlayerAction extends QueuedPlayerAction {
  inputTimestampMs: number;
  sequence: number;
}

export class PlayerActionQueue {
  private pending: PendingPlayerAction[] = [];
  private nextSequence = 0;
  private lastUpdateTimeMs = 0;

  reset(simulationTimeMs: number, updateTimeMs: number): void {
    this.clear();
    this.lastUpdateTimeMs = finiteNonNegative(updateTimeMs);
    this.advanceFrame(simulationTimeMs, 0, updateTimeMs);
  }

  advanceFrame(
    simulationStartMs: number,
    simulationDeltaMs: number,
    updateTimeMs: number,
  ): void {
    const safeSimulationStartMs = finiteNonNegative(simulationStartMs);
    const safeSimulationDeltaMs = finiteNonNegative(simulationDeltaMs);
    const safeUpdateTimeMs = finiteNonNegative(updateTimeMs);
    const rawDeltaMs = Math.max(0, safeUpdateTimeMs - this.lastUpdateTimeMs);

    for (const pending of this.pending) {
      if (Number.isFinite(pending.requestedAtSimulationMs)) continue;
      const rawOffsetMs = Math.max(
        0,
        Math.min(rawDeltaMs, pending.inputTimestampMs - this.lastUpdateTimeMs),
      );
      const frameProgress = rawDeltaMs > 0 ? rawOffsetMs / rawDeltaMs : 1;
      pending.requestedAtSimulationMs = safeSimulationStartMs
        + safeSimulationDeltaMs * frameProgress;
    }
    this.pending.sort((left, right) => (
      left.requestedAtSimulationMs - right.requestedAtSimulationMs
      || left.sequence - right.sequence
    ));
    this.lastUpdateTimeMs = safeUpdateTimeMs;
  }

  requestFire(inputTimestampMs: number, aimDirection: Vector2): void {
    this.enqueue({ type: 'fire', aimDirection: { ...aimDirection } }, inputTimestampMs);
  }

  requestReload(inputTimestampMs: number): void {
    this.enqueue({ type: 'reload' }, inputTimestampMs);
  }

  requestWeaponSlot(slot: 0 | 1, inputTimestampMs: number): void {
    this.enqueue({ type: 'selectWeaponSlot', slot }, inputTimestampMs);
  }

  requestShove(inputTimestampMs: number, aimDirection: Vector2): void {
    this.enqueue({ type: 'shove', aimDirection: { ...aimDirection } }, inputTimestampMs);
  }

  requestWeaponPickup(pickupId: number, inputTimestampMs: number): void {
    this.enqueue({ type: 'pickupWeapon', pickupId }, inputTimestampMs);
  }

  consumeThrough(simulationBoundaryMs: number): QueuedPlayerAction | null {
    const next = this.pending[0];
    if (
      !next
      || !Number.isFinite(next.requestedAtSimulationMs)
      || next.requestedAtSimulationMs > simulationBoundaryMs
    ) return null;
    this.pending.shift();
    return {
      action: next.action,
      requestedAtSimulationMs: next.requestedAtSimulationMs,
    };
  }

  clear(): void {
    this.pending = [];
    this.nextSequence = 0;
  }

  private enqueue(action: PlayerAction, inputTimestampMs: number): void {
    this.pending.push({
      action,
      inputTimestampMs: Number.isFinite(inputTimestampMs)
        ? Math.max(0, inputTimestampMs)
        : this.lastUpdateTimeMs,
      requestedAtSimulationMs: Number.NaN,
      sequence: this.nextSequence,
    });
    this.nextSequence += 1;
  }
}

function finiteNonNegative(value: number): number {
  return Number.isFinite(value) ? Math.max(0, value) : 0;
}
