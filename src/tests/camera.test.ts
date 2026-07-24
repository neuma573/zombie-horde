import { describe, expect, it } from 'vitest';

import {
  cameraScreenPoint,
  cameraScrollForPlayer,
  cameraWorldView,
  createWorldSize,
} from '../logic/camera';

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

  it('uses the zoom-adjusted visible world size at map edges', () => {
    const scroll = cameraScrollForPlayer(
      { x: 1_200, y: 800 },
      { width: 2_400, height: 1_600 },
      { width: 960, height: 540 },
      1.5,
    );

    expect(scroll).toEqual({ x: 720, y: 530 });
    expect(cameraWorldView(scroll, { width: 960, height: 540 }, 1.5)).toEqual({
      x: 880,
      y: 620,
      width: 640,
      height: 360,
    });
    expect(cameraScreenPoint(
      { x: 1_200, y: 800 },
      scroll,
      { width: 960, height: 540 },
      1.5,
    )).toEqual({ x: 480, y: 270 });
  });

  it('keeps the player centered while zooming away from map edges', () => {
    const player = { x: 1_200, y: 800 };
    const world = { width: 2_400, height: 1_600 };
    const viewport = { width: 960, height: 540 };

    for (const zoom of [0.75, 1, 1.5]) {
      const scroll = cameraScrollForPlayer(player, world, viewport, zoom);
      expect(cameraScreenPoint(player, scroll, viewport, zoom)).toEqual({
        x: 480,
        y: 270,
      });
    }
  });
});
