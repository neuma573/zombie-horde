export interface DelayedGaugeState {
  displayedRatio: number;
  targetRatio: number;
  delayRemainingMs: number;
}

export const DELAYED_GAUGE_HOLD_MS = 300;
export const DELAYED_GAUGE_FULL_DEPLETION_MS = 900;

function clampRatio(value: number): number {
  return Math.min(1, Math.max(0, Number.isFinite(value) ? value : 0));
}

export function createDelayedGaugeState(ratio: number): DelayedGaugeState {
  const normalized = clampRatio(ratio);
  return {
    displayedRatio: normalized,
    targetRatio: normalized,
    delayRemainingMs: 0,
  };
}

export function advanceDelayedGauge(
  state: DelayedGaugeState,
  targetRatio: number,
  deltaMs: number,
): DelayedGaugeState {
  const target = clampRatio(targetRatio);
  const elapsedMs = Math.max(0, Number.isFinite(deltaMs) ? deltaMs : 0);

  if (target > state.targetRatio || target >= state.displayedRatio) {
    return createDelayedGaugeState(target);
  }

  const tookDamage = target < state.targetRatio;
  if (tookDamage) {
    return {
      displayedRatio: state.displayedRatio,
      targetRatio: target,
      delayRemainingMs: DELAYED_GAUGE_HOLD_MS,
    };
  }

  const holdMs = Math.max(0, state.delayRemainingMs);
  const trailingElapsedMs = Math.max(0, elapsedMs - holdMs);
  const nextHoldMs = Math.max(0, holdMs - elapsedMs);
  const displayedRatio = Math.max(
    target,
    state.displayedRatio
      - trailingElapsedMs / DELAYED_GAUGE_FULL_DEPLETION_MS,
  );

  return {
    displayedRatio,
    targetRatio: target,
    delayRemainingMs: displayedRatio === target ? 0 : nextHoldMs,
  };
}
