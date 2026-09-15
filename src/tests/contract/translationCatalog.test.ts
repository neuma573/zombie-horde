import { describe, expect, it } from 'vitest';
import { korean, translate } from '../../i18n/catalog';
import { WEAPON_DEFINITIONS } from '../../config/weaponConfig';
import { CHARACTER_CLASS_OPTIONS } from '../../config/menuConfig';
import { DEBUG_CONSUMABLES, DEBUG_FILE_ASSETS } from '../../config/assetDebugCatalog';

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
      ...Object.values(DEBUG_CONSUMABLES).map((item) => item.name),
    ];
    for (const message of messages) {
      expect(korean).toHaveProperty(message);
      expect(translate('ko', message).trim()).not.toBe('');
    }
  });

  it('discovers image and sound assets in the debug catalog', () => {
    const paths = Object.keys(DEBUG_FILE_ASSETS);
    expect(paths).toContain('../assets/weapons/pistol.png');
    expect(paths).toContain('../assets/characters/female.webp');
    expect(paths).toContain('../assets/sounds/shotgun_fire.mp3');
    expect(Object.values(DEBUG_FILE_ASSETS).every((url) => typeof url === 'string' && url.length > 0)).toBe(true);
  });
});
