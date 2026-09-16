import { describe, expect, it } from 'vitest';
import { DEBUG_FILE_ASSETS } from '../../config/assetDebugCatalog';

describe('asset debug catalog', () => {
  it('discovers image and sound assets in the debug catalog', () => {
    const paths = Object.keys(DEBUG_FILE_ASSETS);
    expect(paths).toContain('../assets/weapons/pistol.png');
    expect(paths).toContain('../assets/characters/female.webp');
    expect(paths).toContain('../assets/sounds/shotgun_fire.mp3');
    expect(Object.values(DEBUG_FILE_ASSETS).every((url) => typeof url === 'string' && url.length > 0)).toBe(true);
  });
});
