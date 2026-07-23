export interface FixedStepState {
  accumulatorMs: number;
}

export interface FixedStepConsumption {
  state: FixedStepState;
  stepCount: number;
}

const TIME_EPSILON_MS = 1e-9;

export function createFixedStepState(): FixedStepState {
  return { accumulatorMs: 0 };
}

export function consumeFixedSteps(
  state: FixedStepState,
  deltaMs: number,
  fixedStepMs: number,
): FixedStepConsumption {
  const safeAccumulator = Number.isFinite(state.accumulatorMs)
    ? Math.max(0, state.accumulatorMs)
    : 0;
  const safeDelta = Number.isFinite(deltaMs) ? Math.max(0, deltaMs) : 0;

  if (!Number.isFinite(fixedStepMs) || fixedStepMs <= 0) {
    return { state: { accumulatorMs: safeAccumulator }, stepCount: 0 };
  }

  const totalMs = safeAccumulator + safeDelta;
  const stepCount = Math.floor((totalMs + TIME_EPSILON_MS) / fixedStepMs);
  const remainder = totalMs - stepCount * fixedStepMs;

  return {
    state: {
      accumulatorMs: Math.abs(remainder) <= TIME_EPSILON_MS ? 0 : remainder,
    },
    stepCount,
  };
}
