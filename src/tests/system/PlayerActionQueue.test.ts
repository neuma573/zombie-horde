import { describe, expect, it } from 'vitest';

import { PlayerActionQueue } from '../../systems/PlayerActionQueue';

describe('PlayerActionQueue', () => {
  it('maps event timestamps onto the current simulation timeline', () => {
    const queue = new PlayerActionQueue();
    queue.synchronize(100, 5, 1_000);
    queue.requestFire(1_040);

    expect(queue.consumeThrough(144.99)).toBeNull();
    expect(queue.consumeThrough(145)).toEqual({
      action: { type: 'fire' },
      requestedAtSimulationMs: 145,
    });
  });

  it('preserves fire, weapon-slot, and reload ordering between updates', () => {
    const queue = new PlayerActionQueue();
    queue.synchronize(0, 0, 1_000);
    queue.requestReload(1_050);
    queue.requestWeaponSlot(1, 1_045);
    queue.requestFire(1_040);

    expect(queue.consumeThrough(100)?.action).toEqual({ type: 'fire' });
    expect(queue.consumeThrough(100)?.action).toEqual({
      type: 'selectWeaponSlot',
      slot: 1,
    });
    expect(queue.consumeThrough(100)?.action).toEqual({ type: 'reload' });
    expect(queue.consumeThrough(100)).toBeNull();
  });

  it('preserves dispatch order when actions share a timestamp', () => {
    const queue = new PlayerActionQueue();
    queue.requestFire(0);
    queue.requestReload(0);

    expect(queue.consumeThrough(0)?.action).toEqual({ type: 'fire' });
    expect(queue.consumeThrough(0)?.action).toEqual({ type: 'reload' });
  });

  it('clears pending actions', () => {
    const queue = new PlayerActionQueue();
    queue.requestFire(0);

    queue.clear();

    expect(queue.consumeThrough(Number.POSITIVE_INFINITY)).toBeNull();
  });
});
