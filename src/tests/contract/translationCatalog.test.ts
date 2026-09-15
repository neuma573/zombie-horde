import { describe, expect, it } from 'vitest';
import { korean, translate } from '../../i18n/catalog';
import { WEAPON_DEFINITIONS } from '../../config/weaponConfig';
import { CHARACTER_CLASS_OPTIONS } from '../../config/menuConfig';

describe('translation catalog', () => {
  it.each(Object.entries(korean))('preserves substitution fields in %s', (english, translated) => {
    const fields = (text: string) => [...text.matchAll(/\{(\w+)\}/g)].map((match) => match[1]).sort();
    expect(translated.trim()).not.toBe('');
    expect(fields(translated)).toEqual(fields(english));
  });

  it('provides an explicit Korean entry for every weapon and character label', () => {
    const messages = [
      ...Object.values(WEAPON_DEFINITIONS).flatMap((weapon) => [weapon.name, weapon.description, weapon.rarity.toUpperCase()]),
      ...CHARACTER_CLASS_OPTIONS.flatMap((character) => [character.name, character.roleLabel]),
      '9mm ammunition', 'Rifle ammunition', 'Shotgun shells', 'Medical kit',
    ];
    for (const message of messages) {
      expect(korean).toHaveProperty(message);
      expect(translate('ko', message).trim()).not.toBe('');
    }
  });
});
