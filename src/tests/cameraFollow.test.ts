import { describe, expect, it } from 'vitest';

import { CAMERA_FOLLOW_CONFIG } from '../config/cameraConfig';
import {
  snapCameraFollow,
  updateCameraFollow,
  velocityBetween,
  type CameraFollowState,
} from '../logic/cameraFollow';

function advance(
  initial: CameraFollowState,
  playerPositions: Array<{ x: number; y: number }>,
  deltaMs = 1_000 / 60,
): CameraFollowState {
  let state = initial;
  let previous = playerPositions[0];

  for (const position of playerPositions.slice(1)) {
    state = updateCameraFollow(
      state,
      position,
      velocityBetween(previous, position, deltaMs),
      deltaMs,
      CAMERA_FOLLOW_CONFIG,
    );
    previous = position;
  }

  return state;
}

describe('dynamic camera follow', () => {
  it('snaps initial state to the player without look-ahead', () => {
    expect(snapCameraFollow({ x: 400, y: 300 })).toEqual({
      targetPosition: { x: 400, y: 300 },
      lookAheadOffset: { x: 0, y: 0 },
    });
  });

  it('follows movement with delay and looks ahead in its direction', () => {
    const initial = snapCameraFollow({ x: 400, y: 300 });
    const next = updateCameraFollow(
      initial,
      { x: 404, y: 300 },
      { x: 240, y: 0 },
      1_000 / 60,
      CAMERA_FOLLOW_CONFIG,
    );

    expect(next.lookAheadOffset.x).toBeGreaterThan(0);
    expect(next.targetPosition.x).toBeGreaterThan(400);
    expect(next.targetPosition.x).toBeLessThan(404 + next.lookAheadOffset.x);
    expect(next.targetPosition.y).toBe(300);
  });

  it('changes direction continuously instead of flipping the offset', () => {
    const right = updateCameraFollow(
      snapCameraFollow({ x: 400, y: 300 }),
      { x: 404, y: 300 },
      { x: 240, y: 0 },
      1_000 / 60,
      CAMERA_FOLLOW_CONFIG,
    );
    const reversed = updateCameraFollow(
      right,
      { x: 400, y: 300 },
      { x: -240, y: 0 },
      1_000 / 60,
      CAMERA_FOLLOW_CONFIG,
    );

    expect(reversed.lookAheadOffset.x).toBeLessThan(right.lookAheadOffset.x);
    expect(reversed.lookAheadOffset.x).toBeGreaterThan(-CAMERA_FOLLOW_CONFIG.lookAheadDistance);
  });

  it('ignores tiny movement velocity for look-ahead', () => {
    const next = updateCameraFollow(
      snapCameraFollow({ x: 400, y: 300 }),
      { x: 400.05, y: 300 },
      { x: 3, y: 0 },
      1_000 / 60,
      CAMERA_FOLLOW_CONFIG,
    );

    expect(next.lookAheadOffset).toEqual({ x: 0, y: 0 });
  });

  it('follows collision separation without treating it as movement look-ahead', () => {
    const next = updateCameraFollow(
      snapCameraFollow({ x: 400, y: 300 }),
      { x: 404, y: 300 },
      { x: 0, y: 0 },
      1_000 / 60,
      CAMERA_FOLLOW_CONFIG,
    );

    expect(next.lookAheadOffset).toEqual({ x: 0, y: 0 });
    expect(next.targetPosition.x).toBeGreaterThan(400);
    expect(next.targetPosition.x).toBeLessThan(404);
  });

  it('returns look-ahead toward zero and converges after stopping', () => {
    let state = snapCameraFollow({ x: 400, y: 300 });
    for (let index = 0; index < 60; index += 1) {
      const player = { x: 400 + (index + 1) * 4, y: 300 };
      state = updateCameraFollow(
        state,
        player,
        { x: 240, y: 0 },
        1_000 / 60,
        CAMERA_FOLLOW_CONFIG,
      );
    }
    const stoppedPlayer = { x: 640, y: 300 };
    for (let index = 0; index < 180; index += 1) {
      state = updateCameraFollow(
        state,
        stoppedPlayer,
        { x: 0, y: 0 },
        1_000 / 60,
        CAMERA_FOLLOW_CONFIG,
      );
    }

    expect(state.lookAheadOffset.x).toBeCloseTo(0, 2);
    expect(state.targetPosition.x).toBeCloseTo(stoppedPlayer.x, 2);
    expect(state.targetPosition.y).toBeCloseTo(stoppedPlayer.y, 2);
  });

  it('produces the same state when identical fixed steps span different render grouping', () => {
    const positions = Array.from({ length: 61 }, (_value, index) => ({
      x: 400 + index * 4,
      y: 300,
    }));
    const oneRenderBatch = advance(snapCameraFollow(positions[0]), positions);
    const firstHalf = advance(snapCameraFollow(positions[0]), positions.slice(0, 31));
    const secondHalf = advance(firstHalf, positions.slice(30));

    expect(secondHalf.targetPosition.x).toBeCloseTo(oneRenderBatch.targetPosition.x, 12);
    expect(secondHalf.lookAheadOffset.x).toBeCloseTo(oneRenderBatch.lookAheadOffset.x, 12);
  });

  it('derives actual velocity from post-collision movement', () => {
    expect(velocityBetween({ x: 10, y: 20 }, { x: 14, y: 20 }, 20)).toEqual({
      x: 200,
      y: 0,
    });
    expect(velocityBetween({ x: 10, y: 20 }, { x: 14, y: 20 }, 0)).toEqual({
      x: 0,
      y: 0,
    });
  });
});
