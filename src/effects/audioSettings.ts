export interface SoundMuteTarget {
  mute: boolean;
}

export function syncSoundEnabled(
  sound: SoundMuteTarget,
  soundEnabled: boolean,
): void {
  sound.mute = !soundEnabled;
}
