export interface PinchZoomState {
  isPinching: boolean;
  referenceDistance: number | null;
  previousDistance: number | null;
}

export interface PinchZoomResult {
  state: PinchZoomState;
  targetZoom: number;
  started: boolean;
}

export function clampZoom(zoom: number, minZoom: number, maxZoom: number): number {
  const lower = Math.min(minZoom, maxZoom);
  const upper = Math.max(minZoom, maxZoom);
  const finiteZoom = Number.isFinite(zoom) ? zoom : lower;
  return Math.min(upper, Math.max(lower, finiteZoom));
}

export function wheelZoomTarget(
  targetZoom: number,
  deltaY: number,
  step: number,
  minZoom: number,
  maxZoom: number,
): number {
  if (deltaY === 0 || !Number.isFinite(deltaY)) {
    return clampZoom(targetZoom, minZoom, maxZoom);
  }

  const direction = deltaY < 0 ? 1 : -1;
  return clampZoom(targetZoom + direction * Math.abs(step), minZoom, maxZoom);
}

export function createPinchZoomState(): PinchZoomState {
  return {
    isPinching: false,
    referenceDistance: null,
    previousDistance: null,
  };
}

export function resetPinchZoom(): PinchZoomState {
  return createPinchZoomState();
}

export function updatePinchZoom(
  state: PinchZoomState,
  pointerCount: number,
  currentDistance: number,
  targetZoom: number,
  options: {
    thresholdPixels: number;
    sensitivity: number;
    minZoom: number;
    maxZoom: number;
  },
): PinchZoomResult {
  if (pointerCount < 2 || !Number.isFinite(currentDistance) || currentDistance <= 0) {
    return {
      state: resetPinchZoom(),
      targetZoom: clampZoom(targetZoom, options.minZoom, options.maxZoom),
      started: false,
    };
  }

  if (state.referenceDistance === null || state.previousDistance === null) {
    return {
      state: {
        isPinching: false,
        referenceDistance: currentDistance,
        previousDistance: currentDistance,
      },
      targetZoom: clampZoom(targetZoom, options.minZoom, options.maxZoom),
      started: false,
    };
  }

  if (!state.isPinching) {
    if (Math.abs(currentDistance - state.referenceDistance) < options.thresholdPixels) {
      return {
        state,
        targetZoom: clampZoom(targetZoom, options.minZoom, options.maxZoom),
        started: false,
      };
    }

    const scale = currentDistance / state.previousDistance;
    const adjustedScale = 1 + (scale - 1) * options.sensitivity;
    return {
      state: {
        isPinching: true,
        referenceDistance: state.referenceDistance,
        previousDistance: currentDistance,
      },
      targetZoom: clampZoom(
        targetZoom * adjustedScale,
        options.minZoom,
        options.maxZoom,
      ),
      started: true,
    };
  }

  const scale = currentDistance / state.previousDistance;
  const adjustedScale = 1 + (scale - 1) * options.sensitivity;
  return {
    state: {
      ...state,
      previousDistance: currentDistance,
    },
    targetZoom: clampZoom(
      targetZoom * adjustedScale,
      options.minZoom,
      options.maxZoom,
    ),
    started: false,
  };
}

export function interpolateCameraZoom(
  currentZoom: number,
  targetZoom: number,
  deltaMs: number,
  smoothSpeed: number,
  snapThreshold: number,
): number {
  if (Math.abs(currentZoom - targetZoom) < Math.max(0, snapThreshold)) {
    return targetZoom;
  }

  const seconds = Math.max(0, Number.isFinite(deltaMs) ? deltaMs : 0) / 1_000;
  const interpolation = 1 - Math.exp(-Math.max(0, smoothSpeed) * seconds);
  return currentZoom + (targetZoom - currentZoom) * interpolation;
}
