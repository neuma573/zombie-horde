import { describe, expect, it } from 'vitest';

import { cameraScrollForPlayer, createWorldSize } from '../logic/camera';

describe('responsive world and camera', () => {
  it('keeps the configured medium map when the viewport is smaller', () => {
    expect(createWorldSize(
      { width: 2_400, height: 1_600 },
      { width: 960, height: 540 },
    )).toEqual({ width: 2_400, height: 1_600 });
  });

  it('expands only the map axes that are smaller than the viewport', () => {
    expect(createWorldSize(
      { width: 2_400, height: 1_600 },
      { width: 2_560, height: 1_440 },
    )).toEqual({ width: 2_560, height: 1_600 });
  });

  it('centers the camera on the player away from map edges', () => {
    expect(cameraScrollForPlayer(
      { x: 1_200, y: 800 },
      { width: 2_400, height: 1_600 },
      { width: 960, height: 540 },
    )).toEqual({ x: 720, y: 530 });
  });

  it('stops the camera at map edges without exposing empty space', () => {
    const world = { width: 2_400, height: 1_600 };
    const viewport = { width: 960, height: 540 };

    expect(cameraScrollForPlayer({ x: 18, y: 18 }, world, viewport)).toEqual({ x: 0, y: 0 });
    expect(cameraScrollForPlayer({ x: 2_382, y: 1_582 }, world, viewport)).toEqual({
      x: 1_440,
      y: 1_060,
    });
  });

  it('keeps the camera fixed on an axis that matches the viewport', () => {
    expect(cameraScrollForPlayer(
      { x: 1_000, y: 600 },
      { width: 1_000, height: 1_600 },
      { width: 1_000, height: 600 },
    )).toEqual({ x: 0, y: 300 });
  });
});
