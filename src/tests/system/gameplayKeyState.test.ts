import { describe, expect, it } from 'vitest';

import { GameplayKeyStateGuard } from '../../systems/gameplayKeyState';

interface GameplayKeyFixture {
  keyCode: number;
  enabled: boolean;
  isDown: boolean;
  justDown: boolean;
  reset(): void;
}

function createKey(keyCode: number, isDown: boolean): GameplayKeyFixture {
  return {
    keyCode,
    enabled: true,
    isDown,
    justDown: isDown,
    reset() {
      this.isDown = false;
      this.justDown = false;
    },
  };
}

describe('gameplay key state adapter', () => {
  it('suppresses held gameplay input until its physical keyup', () => {
    const guard = new GameplayKeyStateGuard();
    const reload = createKey(82, true);
    const interact = createKey(69, false);

    guard.suppressHeldUntilKeyUp([reload, interact]);

    expect(reload).toMatchObject({ enabled: false, isDown: false, justDown: false });
    expect(interact).toMatchObject({ enabled: true, isDown: false, justDown: false });

    guard.releaseOnKeyUp(82);

    expect(reload.enabled).toBe(true);
    expect(interact.enabled).toBe(true);
  });

  it('suppresses a gameplay key pressed after pause opens', () => {
    const guard = new GameplayKeyStateGuard();
    const interact = createKey(69, true);

    guard.suppressUntilKeyUp(interact);

    expect(interact.enabled).toBe(false);
    guard.releaseOnKeyUp(69);
    expect(interact.enabled).toBe(true);
  });

  it('restores every suppressed key when gameplay is abandoned', () => {
    const guard = new GameplayKeyStateGuard();
    const reload = createKey(82, true);
    const interact = createKey(69, true);

    guard.suppressHeldUntilKeyUp([undefined, reload, interact]);
    guard.releaseAll();

    expect(reload.enabled).toBe(true);
    expect(interact.enabled).toBe(true);
  });
});
