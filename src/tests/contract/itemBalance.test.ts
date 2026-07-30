import { describe, expect, it } from 'vitest';

import { ITEM_BALANCE_CONFIG } from '../../config/itemConfig';
import { SUPPLY_DROP_BALANCE } from '../../config/supplyDropConfig';

describe('item balance', () => {
  it('configures a non-zero rifle drop chance', () => {
    expect(SUPPLY_DROP_BALANCE.rifleDropChance).toBeGreaterThan(0);
  });

  it('configures pistol ammunition pickups to grant 68 rounds', () => {
    expect(ITEM_BALANCE_CONFIG.pistolAmmoAmount).toBe(68);
  });
});
