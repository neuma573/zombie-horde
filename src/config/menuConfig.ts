import femalePortraitUrl from '../../docs/references/female.png?url';
import malePortraitUrl from '../../docs/references/male.png?url';

export const GAME_REGISTRY_KEYS = {
  soundEnabled: 'settings.soundEnabled',
  characterClassId: 'session.characterClassId',
} as const;

export const DEFAULT_GAME_SETTINGS = {
  soundEnabled: true,
} as const;

export type CharacterClassId = 'male-survivor' | 'female-survivor';

export interface CharacterClassOption {
  id: CharacterClassId;
  name: string;
  roleLabel: string;
  portraitTextureKey: string;
  portraitUrl: string | null;
  portraitCrop: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

export const CHARACTER_CLASS_OPTIONS: readonly CharacterClassOption[] = [
  {
    id: 'male-survivor',
    name: 'JOHN DOE',
    roleLabel: 'MALE SURVIVOR',
    portraitTextureKey: 'class-male-survivor',
    portraitUrl: malePortraitUrl,
    portraitCrop: { x: 80, y: 20, width: 864, height: 1_450 },
  },
  {
    id: 'female-survivor',
    name: 'JANE DOE',
    roleLabel: 'FEMALE SURVIVOR',
    portraitTextureKey: 'class-female-survivor',
    portraitUrl: femalePortraitUrl,
    portraitCrop: { x: 120, y: 20, width: 784, height: 1_450 },
  },
];
