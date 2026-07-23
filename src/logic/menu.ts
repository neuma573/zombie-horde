import {
  CHARACTER_CLASS_OPTIONS,
  type CharacterClassId,
} from '../config/menuConfig';

export interface GameSettings {
  soundEnabled: boolean;
}

export function toggleSound(settings: GameSettings): GameSettings {
  return {
    ...settings,
    soundEnabled: !settings.soundEnabled,
  };
}

export function selectCharacterClass(
  current: CharacterClassId | null,
  requested: string,
): CharacterClassId | null {
  const option = CHARACTER_CLASS_OPTIONS.find(({ id }) => id === requested);
  return option?.id ?? current;
}
