import { describe, expect, it } from 'vitest';

import {
  clampZoom,
  createPinchZoomState,
  interpolateCameraZoom,
  updatePinchZoom,
  wheelZoomTarget,
} from '../logic/cameraZoom';

const options = {
  thresholdPixels: 6,
  sensitivity: 0.6,
  minZoom: 0.75,
  maxZoom: 1.5,
};

describe('camera zoom', () => {
  it('uses only wheel direction and clamps the target', () => {
    expect(wheelZoomTarget(1, -1, 0.1, 0.75, 1.5)).toBe(1.1);
    expect(wheelZoomTarget(1, -10_000, 0.1, 0.75, 1.5)).toBe(1.1);
    expect(wheelZoomTarget(1, 1, 0.1, 0.75, 1.5)).toBe(0.9);
    expect(wheelZoomTarget(1.49, -1, 0.1, 0.75, 1.5)).toBe(1.5);
    expect(wheelZoomTarget(0.76, 1, 0.1, 0.75, 1.5)).toBe(0.75);
  });

  it('stores the first pinch distance without changing zoom', () => {
    const result = updatePinchZoom(createPinchZoomState(), 2, 100, 1, options);

    expect(result.targetZoom).toBe(1);
    expect(result.state.previousDistance).toBe(100);
    expect(result.state.isPinching).toBe(false);
  });

  it('ignores small distance changes and zooms by distance ratio after the threshold', () => {
    const initial = updatePinchZoom(createPinchZoomState(), 2, 100, 1, options);
    const ignored = updatePinchZoom(initial.state, 2, 105, 1, options);
    const enlarged = updatePinchZoom(ignored.state, 2, 120, 1, options);
    const reduced = updatePinchZoom(enlarged.state, 2, 96, enlarged.targetZoom, options);

    expect(ignored.state.isPinching).toBe(false);
    expect(ignored.targetZoom).toBe(1);
    expect(enlarged.state.isPinching).toBe(true);
    expect(enlarged.targetZoom).toBeGreaterThan(1);
    expect(reduced.targetZoom).toBeLessThan(enlarged.targetZoom);
  });

  it('resets pinch state when fewer than two pointers remain', () => {
    const active = {
      isPinching: true,
      referenceDistance: 100,
      previousDistance: 120,
    };
    const result = updatePinchZoom(active, 1, 0, 1.2, options);

    expect(result.state).toEqual(createPinchZoomState());
    expect(result.targetZoom).toBe(1.2);
  });

  it('clamps direct and pinch zoom values', () => {
    expect(clampZoom(-10, 0.75, 1.5)).toBe(0.75);
    expect(clampZoom(10, 0.75, 1.5)).toBe(1.5);

    const initial = updatePinchZoom(createPinchZoomState(), 2, 10, 1.5, options);
    expect(updatePinchZoom(initial.state, 2, 1_000, 1.5, options).targetZoom).toBe(1.5);
  });

  it('uses time-based exponential interpolation', () => {
    const oneFrame = interpolateCameraZoom(1, 1.5, 1_000, 12, 0);
    const half = interpolateCameraZoom(1, 1.5, 500, 12, 0);
    const twoFrames = interpolateCameraZoom(half, 1.5, 500, 12, 0);

    expect(twoFrames).toBeCloseTo(oneFrame, 12);
    expect(interpolateCameraZoom(1.4995, 1.5, 16, 12, 0.001)).toBe(1.5);
  });
});
