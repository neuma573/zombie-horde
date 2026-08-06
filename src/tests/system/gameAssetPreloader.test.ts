import { describe, expect, it, vi } from 'vitest';

import { CHARACTER_CLASS_OPTIONS } from '../../config/menuConfig';
import { WEAPON_AUDIO_ASSETS } from '../../config/weaponAudioConfig';
import {
  CROSSWALK_TEXTURE_KEY,
  GAME_IMAGE_ASSETS,
  NO_STOPPING_ZONE_TEXTURE_KEY,
  ROAD_DIAMOND_OUTLINE_TEXTURE_KEY,
  preloadGameAssets,
} from '../../effects/gameAssetPreloader';

function createRuntime(
  loadedImages: readonly string[] = [],
  loadedAudio: readonly string[] = [],
) {
  return {
    textures: {
      exists: (key: string) => loadedImages.includes(key),
    },
    cache: {
      audio: {
        exists: (key: string) => loadedAudio.includes(key),
      },
    },
    load: {
      image: vi.fn(),
      audio: vi.fn(),
    },
  };
}

describe('game asset preloader', () => {
  it('registers the crosswalk under its rendering texture key', () => {
    expect(GAME_IMAGE_ASSETS[CROSSWALK_TEXTURE_KEY]).toMatch(/^data:image\/svg\+xml,/);
  });

  it('registers the road diamond under its rendering texture key', () => {
    expect(GAME_IMAGE_ASSETS[ROAD_DIAMOND_OUTLINE_TEXTURE_KEY])
      .toMatch(/^data:image\/svg\+xml,/);
  });

  it('registers the no-stopping zone under its rendering texture key', () => {
    expect(GAME_IMAGE_ASSETS[NO_STOPPING_ZONE_TEXTURE_KEY])
      .toMatch(/^data:image\/svg\+xml,/);
  });

  it('queues every image and sound required after the main menu', () => {
    const runtime = createRuntime();

    preloadGameAssets(runtime);

    const portraitAssets = CHARACTER_CLASS_OPTIONS.map((option) => [
      option.portraitTextureKey,
      option.portraitUrl,
    ]);
    expect(runtime.load.image.mock.calls).toEqual([
      ...portraitAssets,
      ...Object.entries(GAME_IMAGE_ASSETS),
    ]);
    expect(runtime.load.audio.mock.calls).toEqual(
      Object.entries(WEAPON_AUDIO_ASSETS),
    );
  });

  it('does not queue assets that are already cached', () => {
    const loadedImages = [
      CHARACTER_CLASS_OPTIONS[0].portraitTextureKey,
      'weapon-pistol',
    ];
    const loadedAudio = ['audio-pistol-equip'];
    const runtime = createRuntime(loadedImages, loadedAudio);

    preloadGameAssets(runtime);

    expect(runtime.load.image.mock.calls.flatMap(([key]) => key)).not.toEqual(
      expect.arrayContaining(loadedImages),
    );
    expect(runtime.load.audio.mock.calls.flatMap(([key]) => key)).not.toEqual(
      expect.arrayContaining(loadedAudio),
    );
  });
});
