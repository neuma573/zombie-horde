import { describe, expect, it } from 'vitest';

import {
  clearActiveInput,
  consumeFireRequest,
  consumeReloadRequest,
  createPlayerInputState,
  requestFire,
  requestReload,
  withAimCandidate,
  withMovement,
} from '../logic/playerInput';
import { moveWithinBounds } from '../logic/movement';

describe('common player input', () => {
  it('keeps one valid aim direction for player rotation and hitscan consumers', () => {
    const aimed = withAimCandidate(createPlayerInputState(), { x: 3, y: 4 });
    const zeroAim = withAimCandidate(aimed, { x: 0, y: 0 });

    expect(aimed.manualAimDirection).toEqual({ x: 0.6, y: 0.8 });
    expect(zeroAim.manualAimDirection).toEqual(aimed.manualAimDirection);
  });

  it('consumes fire and reload requests exactly once', () => {
    let state = requestReload(requestFire(requestFire(createPlayerInputState())));
    const fire = consumeFireRequest(state);
    state = fire.state;
    const secondFire = consumeFireRequest(state);
    state = secondFire.state;
    const reload = consumeReloadRequest(state);
    state = reload.state;

    expect(fire.requested).toBe(true);
    expect(secondFire.requested).toBe(true);
    expect(reload.requested).toBe(true);
    expect(consumeFireRequest(state).requested).toBe(false);
    expect(consumeReloadRequest(state).requested).toBe(false);
  });

  it('clears active movement and requests without losing the last aim', () => {
    const active = requestFire(withMovement(
      withAimCandidate(createPlayerInputState(), { x: 0, y: -2 }),
      { x: 1, y: 0.5 },
    ));

    expect(clearActiveInput(active)).toEqual({
      movement: { x: 0, y: 0 },
      manualAimDirection: { x: 0, y: -1 },
      pendingFireCount: 0,
      reloadRequested: false,
    });
  });

  it('produces the same game result from equivalent PC and mobile intentions', () => {
    const pc = withAimCandidate(
      withMovement(createPlayerInputState(), { x: 1, y: 1 }),
      { x: 40, y: -20 },
    );
    const mobile = withAimCandidate(
      withMovement(createPlayerInputState(), { x: 0.6, y: 0.6 }),
      { x: 2, y: -1 },
    );
    const bounds = { width: 800, height: 600, padding: 18 };

    expect(moveWithinBounds({ x: 400, y: 300 }, pc.movement, 240, 16, bounds))
      .toEqual(moveWithinBounds({ x: 400, y: 300 }, mobile.movement, 240, 16, bounds));
    expect(pc.manualAimDirection).toEqual(mobile.manualAimDirection);
  });
});
