import { describe, expect, it } from 'vitest';

import { PlayerActionQueue } from '../../systems/PlayerActionQueue';

describe('PlayerActionQueue', () => {
  it('maps raw frame timestamps into the simulated frame delta', () => {
    const stalledFrame = new PlayerActionQueue();
    stalledFrame.reset(100, 1_000);
    stalledFrame.requestFire(1_100, { x: 1, y: 0 });
    stalledFrame.advanceFrame(100, 20, 1_200);
    const regularFrame = new PlayerActionQueue();
    regularFrame.reset(100, 1_000);
    regularFrame.requestFire(1_010, { x: 1, y: 0 });
    regularFrame.advanceFrame(100, 20, 1_020);

    expect(stalledFrame.consumeThrough(109.99)).toBeNull();
    expect(stalledFrame.consumeThrough(110)).toEqual({
      action: { type: 'fire', aimDirection: { x: 1, y: 0 } },
      requestedAtSimulationMs: 110,
    });
    expect(regularFrame.consumeThrough(110)?.requestedAtSimulationMs).toBe(110);
  });

  it('preserves all combat action ordering between updates', () => {
    const queue = new PlayerActionQueue();
    queue.reset(0, 1_000);
    queue.requestReload(1_050);
    queue.requestWeaponSlot(1, 1_045);
    queue.requestShove(1_042, { x: 0, y: 1 });
    queue.requestFire(1_040, { x: 1, y: 0 });
    queue.advanceFrame(0, 20, 1_100);

    expect(queue.consumeThrough(20)?.action).toEqual({
      type: 'fire',
      aimDirection: { x: 1, y: 0 },
    });
    expect(queue.consumeThrough(20)?.action).toEqual({
      type: 'shove',
      aimDirection: { x: 0, y: 1 },
    });
    expect(queue.consumeThrough(20)?.action).toEqual({
      type: 'selectWeaponSlot',
      slot: 1,
    });
    expect(queue.consumeThrough(20)?.action).toEqual({ type: 'reload' });
    expect(queue.consumeThrough(20)).toBeNull();
  });

  it('preserves dispatch order when actions share a timestamp', () => {
    const queue = new PlayerActionQueue();
    queue.requestFire(0, { x: 1, y: 0 });
    queue.requestReload(0);
    queue.advanceFrame(0, 0, 0);

    expect(queue.consumeThrough(0)?.action.type).toBe('fire');
    expect(queue.consumeThrough(0)?.action).toEqual({ type: 'reload' });
  });

  it('preserves the input-time aim direction', () => {
    const queue = new PlayerActionQueue();
    const aimDirection = { x: 1, y: 0 };
    queue.requestFire(0, aimDirection);
    aimDirection.x = 0;
    aimDirection.y = 1;
    queue.advanceFrame(0, 0, 0);

    expect(queue.consumeThrough(0)?.action).toEqual({
      type: 'fire',
      aimDirection: { x: 1, y: 0 },
    });
  });

  it('clears pending actions', () => {
    const queue = new PlayerActionQueue();
    queue.requestFire(0, { x: 1, y: 0 });

    queue.clear();

    expect(queue.consumeThrough(Number.POSITIVE_INFINITY)).toBeNull();
  });
});
