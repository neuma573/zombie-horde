import { describe, expect, it } from 'vitest';

import { syncSoundEnabled } from '../../effects/audioSettings';

describe('audio settings', () => {
  it('mutes audio output when sound is disabled', () => {
    const sound = { mute: false };

    syncSoundEnabled(sound, false);

    expect(sound.mute).toBe(true);
  });

  it('restores audio output when sound is enabled', () => {
    const sound = { mute: true };

    syncSoundEnabled(sound, true);

    expect(sound.mute).toBe(false);
  });
});
