import {
  cameraScrollForPlayer,
  cameraWorldPoint,
  type Size,
} from './camera';
import type { Vector2 } from './hitscan';
import type { Position } from './movement';

const AIM_EPSILON = 1e-8;

export interface ScreenAimCandidateInput {
  screenPoint: Position;
  playerPosition: Position;
  cameraTargetPosition: Position;
  world: Size;
  viewport: Size;
  zoom: number;
}

export function screenAimCandidate({
  screenPoint,
  playerPosition,
  cameraTargetPosition,
  world,
  viewport,
  zoom,
}: ScreenAimCandidateInput): Vector2 {
  const cameraScroll = cameraScrollForPlayer(
    cameraTargetPosition,
    world,
    viewport,
    zoom,
  );
  const worldPoint = cameraWorldPoint(
    screenPoint,
    cameraScroll,
    viewport,
    zoom,
  );

  return {
    x: worldPoint.x - playerPosition.x,
    y: worldPoint.y - playerPosition.y,
  };
}

export function resolveAimDirection(candidate: Vector2, lastValid: Vector2): Vector2 {
  const length = Math.hypot(candidate.x, candidate.y);

  if (length < AIM_EPSILON) {
    return { ...lastValid };
  }

  return {
    x: candidate.x / length,
    y: candidate.y / length,
  };
}
