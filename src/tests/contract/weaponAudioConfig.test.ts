import { describe, expect, it } from 'vitest';

import {
  WEAPON_AUDIO_ASSETS,
  WEAPON_AUDIO_CONFIG,
} from '../../config/weaponAudioConfig';
import { WEAPON_DEFINITIONS } from '../../config/weaponConfig';

describe('weapon audio configuration', () => {
  it('provides audio for every playable weapon', () => {
    expect(Object.keys(WEAPON_AUDIO_CONFIG.weapons).sort()).toEqual(
      Object.keys(WEAPON_DEFINITIONS).sort(),
    );
  });

  it('references loaded assets with normalized reload cue timing', () => {
    const assetKeys = new Set(Object.keys(WEAPON_AUDIO_ASSETS));

    for (const definition of Object.values(WEAPON_AUDIO_CONFIG.weapons)) {
      expect(assetKeys.has(definition.equipKey)).toBe(true);
      expect(definition.shotKeys.length).toBeGreaterThan(1);
      expect(definition.tailKeys.length).toBeGreaterThan(0);
      for (const key of [
        ...definition.shotKeys,
        ...definition.tailKeys,
        ...definition.reloadCues.map((cue) => cue.key),
      ]) {
        expect(assetKeys.has(key)).toBe(true);
      }
      for (const cue of definition.reloadCues) {
        expect(cue.at).toBeGreaterThanOrEqual(0);
        expect(cue.at).toBeLessThanOrEqual(1);
      }
    }
  });

  it('uses every supplied audio asset', () => {
    const referencedKeys = new Set(
      Object.values(WEAPON_AUDIO_CONFIG.weapons).flatMap((definition) => [
        definition.equipKey,
        ...definition.shotKeys,
        ...definition.tailKeys,
        ...definition.reloadCues.map((cue) => cue.key),
      ]),
    );

    expect(referencedKeys).toEqual(new Set(Object.keys(WEAPON_AUDIO_ASSETS)));
  });
});
