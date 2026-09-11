import { describe, expect, it } from 'vitest';

import {
  PISTOL_WEAPON,
  POLICE_BATON_WEAPON,
} from '../../../config/weaponConfig';
import {
  weaponTooltipStatLines,
  weaponTooltipStats,
} from '../../../logic/hud';

describe('weapon tooltip statistics', () => {
  it('describes melee timing and stamina without firearm statistics', () => {
    const stats = weaponTooltipStats(POLICE_BATON_WEAPON);

    expect(stats).toEqual({
      attackType: 'melee',
      swingIntervalMs: POLICE_BATON_WEAPON.config.fireIntervalMs,
      staminaCost: POLICE_BATON_WEAPON.config.staminaCost,
    });
    expect(weaponTooltipStatLines(stats)).toEqual([
      `SWING INTERVAL ${POLICE_BATON_WEAPON.config.fireIntervalMs}ms`,
      `STAMINA COST ${POLICE_BATON_WEAPON.config.staminaCost}`,
    ]);
  });

  it('preserves fire rate, recoil, and magazine statistics for firearms', () => {
    const stats = weaponTooltipStats(PISTOL_WEAPON);

    expect(weaponTooltipStatLines(stats)).toEqual([
      `FIRE RATE SEMI / ${PISTOL_WEAPON.config.fireIntervalMs}ms   RECOIL ${PISTOL_WEAPON.recoil}`,
      `MAGAZINE ${PISTOL_WEAPON.config.magazineSize}`,
    ]);
  });
});
