export type PlayerAction = {
  type: 'fire';
} | {
  type: 'reload';
} | {
  type: 'selectWeaponSlot';
  slot: 0 | 1;
};

export interface QueuedPlayerAction {
  action: PlayerAction;
  requestedAtSimulationMs: number;
}

interface PendingPlayerAction extends QueuedPlayerAction {
  sequence: number;
}

export class PlayerActionQueue {
  private pending: PendingPlayerAction[] = [];
  private nextSequence = 0;
  private simulationElapsedMs = 0;
  private accumulatorMs = 0;
  private lastUpdateTimeMs = 0;

  synchronize(
    simulationElapsedMs: number,
    accumulatorMs: number,
    updateTimeMs: number,
  ): void {
    this.simulationElapsedMs = finiteNonNegative(simulationElapsedMs);
    this.accumulatorMs = finiteNonNegative(accumulatorMs);
    this.lastUpdateTimeMs = finiteNonNegative(updateTimeMs);
  }

  requestFire(inputTimestampMs: number): void {
    this.enqueue({ type: 'fire' }, inputTimestampMs);
  }

  requestReload(inputTimestampMs: number): void {
    this.enqueue({ type: 'reload' }, inputTimestampMs);
  }

  requestWeaponSlot(slot: 0 | 1, inputTimestampMs: number): void {
    this.enqueue({ type: 'selectWeaponSlot', slot }, inputTimestampMs);
  }

  consumeThrough(simulationBoundaryMs: number): QueuedPlayerAction | null {
    const next = this.pending[0];
    if (!next || next.requestedAtSimulationMs > simulationBoundaryMs) return null;
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
    const elapsedSinceUpdateMs = Number.isFinite(inputTimestampMs)
      ? Math.max(0, inputTimestampMs - this.lastUpdateTimeMs)
      : 0;
    this.pending.push({
      action,
      requestedAtSimulationMs: this.simulationElapsedMs
        + this.accumulatorMs
        + elapsedSinceUpdateMs,
      sequence: this.nextSequence,
    });
    this.nextSequence += 1;
    this.pending.sort((left, right) => (
      left.requestedAtSimulationMs - right.requestedAtSimulationMs
      || left.sequence - right.sequence
    ));
  }
}

function finiteNonNegative(value: number): number {
  return Number.isFinite(value) ? Math.max(0, value) : 0;
}
