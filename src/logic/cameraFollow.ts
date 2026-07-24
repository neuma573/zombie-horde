import type { Position } from './movement';

export interface CameraFollowState {
  targetPosition: Position;
  lookAheadOffset: Position;
}

export interface CameraFollowConfig {
  followSpeed: number;
  lookAheadSpeed: number;
  lookAheadDistance: number;
  movementSpeedThreshold: number;
  maximumPlayerSpeed: number;
  snapThreshold: number;
}

export function snapCameraFollow(playerPosition: Position): CameraFollowState {
  return {
    targetPosition: { ...playerPosition },
    lookAheadOffset: { x: 0, y: 0 },
  };
}

export function velocityBetween(
  start: Position,
  end: Position,
  deltaMs: number,
): Position {
  if (!Number.isFinite(deltaMs) || deltaMs <= 0) {
    return { x: 0, y: 0 };
  }

  const seconds = deltaMs / 1_000;
  return {
    x: (end.x - start.x) / seconds,
    y: (end.y - start.y) / seconds,
  };
}

export function updateCameraFollow(
  state: CameraFollowState,
  playerPosition: Position,
  playerVelocity: Position,
  deltaMs: number,
  config: CameraFollowConfig,
): CameraFollowState {
  const desiredLookAhead = lookAheadForVelocity(playerVelocity, config);
  const lookAheadOffset = dampPosition(
    state.lookAheadOffset,
    desiredLookAhead,
    config.lookAheadSpeed,
    deltaMs,
    config.snapThreshold,
  );
  const desiredTarget = {
    x: playerPosition.x + lookAheadOffset.x,
    y: playerPosition.y + lookAheadOffset.y,
  };
  const targetPosition = dampPosition(
    state.targetPosition,
    desiredTarget,
    config.followSpeed,
    deltaMs,
    config.snapThreshold,
  );

  return { targetPosition, lookAheadOffset };
}

function lookAheadForVelocity(
  velocity: Position,
  config: CameraFollowConfig,
): Position {
  const speed = Math.hypot(velocity.x, velocity.y);
  const threshold = Math.max(0, config.movementSpeedThreshold);
  const maximumSpeed = Math.max(threshold, config.maximumPlayerSpeed);

  if (!Number.isFinite(speed) || speed <= threshold || maximumSpeed <= threshold) {
    return { x: 0, y: 0 };
  }

  const speedRatio = Math.min(1, (speed - threshold) / (maximumSpeed - threshold));
  const distance = Math.max(0, config.lookAheadDistance) * speedRatio;
  return {
    x: velocity.x / speed * distance,
    y: velocity.y / speed * distance,
  };
}

function dampPosition(
  current: Position,
  target: Position,
  responseSpeed: number,
  deltaMs: number,
  snapThreshold: number,
): Position {
  const safeDeltaMs = Number.isFinite(deltaMs) ? Math.max(0, deltaMs) : 0;
  const interpolation = 1 - Math.exp(
    -Math.max(0, responseSpeed) * safeDeltaMs / 1_000,
  );
  const next = {
    x: current.x + (target.x - current.x) * interpolation,
    y: current.y + (target.y - current.y) * interpolation,
  };
  const threshold = Math.max(0, snapThreshold);

  return Math.hypot(target.x - next.x, target.y - next.y) <= threshold
    ? { ...target }
    : next;
}
