import { describe, expect, it } from 'vitest';

import { CAMERA_FOLLOW_CONFIG } from '../../../config/cameraConfig';
import {
  resolveAimDirection,
  screenAimCandidate,
} from '../../../logic/aim';
import {
  snapCameraFollow,
  updateCameraFollow,
  velocityBetween,
} from '../../../logic/cameraFollow';
import { interpolateCameraZoom } from '../../../logic/cameraZoom';
import { HAZARD_DEFENSE_CONFIG } from '../../../config/lastStandCombatConfig';
import { cameraScreenPoint, cameraScrollForPlayer } from '../../../logic/camera';
import { fitDefenseCamera } from '../../../logic/defenseCamera';

const FIXED_STEP_MS = 1_000 / 60;

describe('screenAimCandidate', () => {
  it.each([[1280, 800], [390, 844], [844, 390]])(
    'aims at the displayed defense target after resizing to %i by %i', (width, height) => {
      const viewport = { width, height };
      const layout = HAZARD_DEFENSE_CONFIG;
      const frame = fitDefenseCamera(layout, viewport, true);
      const target = { x: 900, y: 620 };
      const candidate = screenAimCandidate({
        screenPoint: cameraScreenPoint(target, frame.scroll, viewport, frame.zoom),
        playerPosition: layout.playerSpawn,
        cameraScroll: frame.scroll,
        viewport,
        zoom: frame.zoom,
      });

      expect(candidate.x).toBeCloseTo(target.x - layout.playerSpawn.x);
      expect(candidate.y).toBeCloseTo(target.y - layout.playerSpawn.y);
    },
  );
});

function stationaryAimAcrossRenderGroups(renderGroups: number[]) {
  const viewport = { width: 960, height: 540 };
  const world = { width: 4_000, height: 3_000 };
  const screenPoint = { x: 700, y: 180 };
  let player = { x: 2_000, y: 1_500 };
  let camera = snapCameraFollow(player);
  let lastAim = { x: 1, y: 0 };
  let zoom = 1;
  const directions: Array<{ x: number; y: number }> = [];

  for (const stepCount of renderGroups) {
    for (let step = 0; step < stepCount; step += 1) {
      zoom = interpolateCameraZoom(
        zoom,
        1.4,
        FIXED_STEP_MS,
        12,
        0.001,
      );
      lastAim = resolveAimDirection(screenAimCandidate({
        screenPoint,
        playerPosition: player,
        cameraScroll: cameraScrollForPlayer(camera.targetPosition, world, viewport, zoom),
        viewport,
        zoom,
      }), lastAim);
      directions.push(lastAim);

      const previousPlayer = player;
      player = {
        x: player.x + 3,
        y: player.y + 1,
      };
      camera = updateCameraFollow(
        camera,
        player,
        velocityBetween(previousPlayer, player, FIXED_STEP_MS),
        FIXED_STEP_MS,
        CAMERA_FOLLOW_CONFIG,
      );
    }
  }

  return directions;
}

describe('resolveAimDirection', () => {
  it('normalizes a valid aim direction', () => {
    expect(resolveAimDirection({ x: 3, y: 4 }, { x: 1, y: 0 })).toEqual({ x: 0.6, y: 0.8 });
  });

  it('keeps the last valid direction for a zero-length aim', () => {
    expect(resolveAimDirection({ x: 0, y: 0 }, { x: 0, y: -1 })).toEqual({ x: 0, y: -1 });
  });

  it('keeps the last valid direction when aim is below the hitscan threshold', () => {
    expect(resolveAimDirection({ x: 1e-10, y: 0 }, { x: -1, y: 0 })).toEqual({ x: -1, y: 0 });
  });

  it('keeps per-step stationary aim independent of render grouping', () => {
    const oneDelayedFrame = stationaryAimAcrossRenderGroups([4]);
    const fourRegularFrames = stationaryAimAcrossRenderGroups([1, 1, 1, 1]);

    expect(oneDelayedFrame).toHaveLength(4);
    for (let index = 0; index < oneDelayedFrame.length; index += 1) {
      expect(oneDelayedFrame[index].x).toBeCloseTo(fourRegularFrames[index].x, 12);
      expect(oneDelayedFrame[index].y).toBeCloseTo(fourRegularFrames[index].y, 12);
    }
    expect(oneDelayedFrame[1]).not.toEqual(oneDelayedFrame[0]);
  });
});
