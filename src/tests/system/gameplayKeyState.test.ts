import { describe, expect, it } from 'vitest';

import { GameplayKeyStateGuard } from '../../systems/gameplayKeyState';

interface GameplayKeyFixture {
  keyCode: number;
  enabled: boolean;
  isDown: boolean;
  justDown: boolean;
  reset(): void;
}

function createPressedKey(keyCode: number): GameplayKeyFixture {
  return {
    keyCode,
    enabled: true,
    isDown: true,
    justDown: true,
    reset() {
      this.isDown = false;
      this.justDown = false;
    },
  };
}

describe('gameplay key state adapter', () => {
  it('suppresses held gameplay input until its physical keyup', () => {
    const guard = new GameplayKeyStateGuard();
    const reload = createPressedKey(82);
    const interact = createPressedKey(69);

    guard.suppressUntilKeyUp([reload, interact]);

    expect(reload).toMatchObject({ enabled: false, isDown: false, justDown: false });
    expect(interact).toMatchObject({ enabled: false, isDown: false, justDown: false });

    guard.releaseOnKeyUp(82);

    expect(reload.enabled).toBe(true);
    expect(interact.enabled).toBe(false);
  });

  it('restores every suppressed key when gameplay is abandoned', () => {
    const guard = new GameplayKeyStateGuard();
    const reload = createPressedKey(82);
    const interact = createPressedKey(69);

    guard.suppressUntilKeyUp([undefined, reload, interact]);
    guard.releaseAll();

    expect(reload.enabled).toBe(true);
    expect(interact.enabled).toBe(true);
  });
});
