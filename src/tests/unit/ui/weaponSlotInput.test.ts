import { describe, expect, it } from 'vitest';
import { handleWeaponSlotPress } from '../../../logic/hud';

describe('handleWeaponSlotPress', () => {
  it('selects the tapped weapon slot without propagating into world input', () => {
    let propagationStopped = false;
    let selectedSlot: 0 | 1 | null = null;

    handleWeaponSlotPress(
      1,
      () => { propagationStopped = true; },
      (slot) => { selectedSlot = slot; },
    );

    expect(propagationStopped).toBe(true);
    expect(selectedSlot).toBe(1);
  });
});