import { describe, expect, it } from 'vitest';
import { translate } from '../../../i18n/catalog';
import { weaponTooltipStats, weaponTooltipStatLines } from '../../../logic/hud';
import { BURST_RIFLE_WEAPON, POLICE_BATON_WEAPON } from '../../../config/weaponConfig';

describe('localized game text', () => {
  it('substitutes countdown values in the selected language order', () => {
    const key = 'PREPARE\nWAVE {wave} IN {seconds}';
    expect(translate('en', key, { wave: 2, seconds: 3 })).toBe('PREPARE\nWAVE 2 IN 3');
    expect(translate('ko', key, { wave: 2, seconds: 3 })).toBe('준비하세요\n3초 후 2 웨이브');
  });

  it('preserves technical identifiers and unknown asset names', () => {
    expect(translate('ko', 'sounds/shotgun_fire.mp3')).toBe('sounds/shotgun_fire.mp3');
  });

  it('localizes ranged and melee tooltip values without changing weapon stats', () => {
    const rifle = weaponTooltipStatLines(weaponTooltipStats(BURST_RIFLE_WEAPON, 'ko'), 'ko');
    expect(rifle).toEqual(['발사 속도 3점사 / 220ms   반동 7', '탄창 30발']);
    const baton = weaponTooltipStatLines(weaponTooltipStats(POLICE_BATON_WEAPON, 'ko'), 'ko');
    expect(baton).toEqual(['공격 간격 480ms', '스태미나 소모 24']);
  });
});
