import { describe, expect, it } from 'vitest';

import { discardGameplayKeyState } from '../../systems/gameplayKeyState';

interface GameplayKeyFixture {
  isDown: boolean;
  justDown: boolean;
  reset(): void;
}

function createPressedKey(): GameplayKeyFixture {
  return {
    isDown: true,
    justDown: true,
    reset() {
      this.isDown = false;
      this.justDown = false;
    },
  };
}

describe('gameplay key state adapter', () => {
  it('discards held and latched gameplay input before play resumes', () => {
    const reload = createPressedKey();
    const interact = createPressedKey();
    const weaponSlot = createPressedKey();

    discardGameplayKeyState([reload, interact, weaponSlot]);

    expect(reload).toMatchObject({ isDown: false, justDown: false });
    expect(interact).toMatchObject({ isDown: false, justDown: false });
    expect(weaponSlot).toMatchObject({ isDown: false, justDown: false });
  });

  it('ignores unavailable gameplay keys', () => {
    const reload = createPressedKey();

    discardGameplayKeyState([undefined, reload]);

    expect(reload).toMatchObject({ isDown: false, justDown: false });
  });
});
