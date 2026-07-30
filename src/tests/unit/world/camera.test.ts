import { describe, expect, it } from 'vitest';

import {
  cameraScreenPoint,
  cameraScrollForPlayer,
  cameraWorldPoint,
  cameraWorldView,
  clientPointToViewport,
  createWorldSize,
} from '../../../logic/camera';

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

  it('retains off-screen world space at the minimum supported zoom', () => {
    expect(createWorldSize(
      { width: 4_000, height: 3_000 },
      { width: 4_000, height: 3_000 },
      0.75,
      81,
    )).toEqual({
      width: 4_000 / 0.75 + 81,
      height: 3_000 / 0.75 + 81,
    });
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

  it('reprojects a stationary screen pointer after the camera moves', () => {
    const pointer = { x: 720, y: 270 };
    const viewport = { width: 960, height: 540 };

    expect(cameraWorldPoint(pointer, { x: 720, y: 530 }, viewport, 1))
      .toEqual({ x: 1_440, y: 800 });
    expect(cameraWorldPoint(pointer, { x: 760, y: 530 }, viewport, 1))
      .toEqual({ x: 1_480, y: 800 });
  });

  it('changes stationary pointer aim after the player moves between fixed steps', () => {
    const pointer = { x: 720, y: 170 };
    const viewport = { width: 960, height: 540 };
    const worldPoint = cameraWorldPoint(
      pointer,
      { x: 720, y: 530 },
      viewport,
      1,
    );

    expect({
      x: worldPoint.x - 1_200,
      y: worldPoint.y - 800,
    }).toEqual({ x: 240, y: -100 });
    expect({
      x: worldPoint.x - 1_216,
      y: worldPoint.y - 800,
    }).toEqual({ x: 224, y: -100 });
  });

  it('round-trips screen and world points at the current zoom', () => {
    const worldPoint = { x: 1_310, y: 745 };
    const scroll = { x: 720, y: 530 };
    const viewport = { width: 960, height: 540 };
    const zoom = 1.5;

    const screenPoint = cameraScreenPoint(worldPoint, scroll, viewport, zoom);
    expect(cameraWorldPoint(screenPoint, scroll, viewport, zoom))
      .toEqual(worldPoint);
  });

  it('resamples a stationary DOM pointer after the canvas coordinate space changes', () => {
    const clientPoint = { x: 450, y: 250 };

    expect(clientPointToViewport(
      clientPoint,
      { x: 50, y: 50, width: 800, height: 400 },
      { width: 1_600, height: 800 },
    )).toEqual({ x: 800, y: 400 });
    expect(clientPointToViewport(
      clientPoint,
      { x: 50, y: 50, width: 400, height: 200 },
      { width: 1_200, height: 600 },
    )).toEqual({ x: 1_200, y: 600 });
  });

  it('rejects an unusable canvas coordinate space', () => {
    expect(clientPointToViewport(
      { x: 100, y: 100 },
      { x: 0, y: 0, width: 0, height: 600 },
      { width: 800, height: 600 },
    )).toBeNull();
  });

  it('clamps delayed or look-ahead camera targets beyond world edges', () => {
    const world = { width: 2_400, height: 1_600 };
    const viewport = { width: 960, height: 540 };
    const zoom = 0.75;
    const left = cameraScrollForPlayer({ x: -100, y: 800 }, world, viewport, zoom);
    const right = cameraScrollForPlayer({ x: 3_000, y: 800 }, world, viewport, zoom);

    expect(cameraWorldView(left, viewport, zoom).x).toBe(0);
    const rightView = cameraWorldView(right, viewport, zoom);
    expect(rightView.x + rightView.width).toBe(world.width);
  });
});
