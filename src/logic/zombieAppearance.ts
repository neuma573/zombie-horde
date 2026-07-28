import {
  ZOMBIE_HAIR_COLORS,
  ZOMBIE_OUTFIT_PALETTES,
  ZOMBIE_SKIN_PALETTES,
} from '../config/zombieAppearanceConfig';

export type ZombieBodyType = 'slim' | 'average' | 'broad';
export type ZombieArchetype = keyof typeof ZOMBIE_OUTFIT_PALETTES;
export type ZombieHair = 'bald' | 'cropped' | 'side-part' | 'ponytail';
export type ZombieSleeves = 'short' | 'long';
export type ZombieTornSide = 'upper' | 'lower';

export interface ZombieAppearance {
  bodyType: ZombieBodyType;
  archetype: ZombieArchetype;
  hair: ZombieHair;
  sleeves: ZombieSleeves;
  tornSide: ZombieTornSide;
  skin: (typeof ZOMBIE_SKIN_PALETTES)[number];
  clothing: { readonly base: number; readonly detail: number };
  hairColor: (typeof ZOMBIE_HAIR_COLORS)[number];
  posture: {
    upperElbowX: number;
    upperElbowY: number;
    upperHandX: number;
    upperHandY: number;
    lowerElbowX: number;
    lowerElbowY: number;
    lowerHandX: number;
    lowerHandY: number;
  };
}

interface ZombieArchetypePreset {
  archetype: ZombieArchetype;
  weight: number;
  bodyTypes: readonly ZombieBodyType[];
  hairStyles: readonly ZombieHair[];
  sleeves: readonly ZombieSleeves[];
  skinIndices: readonly number[];
}

const ARCHETYPE_PRESETS: readonly ZombieArchetypePreset[] = [
  {
    archetype: 'casualMale',
    weight: 30,
    bodyTypes: ['average', 'broad'],
    hairStyles: ['bald', 'cropped', 'side-part'],
    sleeves: ['short', 'long'],
    skinIndices: [0, 1, 2, 3],
  },
  {
    archetype: 'casualFemale',
    weight: 30,
    bodyTypes: ['slim', 'average'],
    hairStyles: ['cropped', 'side-part', 'ponytail'],
    sleeves: ['short', 'long'],
    skinIndices: [0, 1, 2, 3],
  },
  {
    archetype: 'office',
    weight: 12,
    bodyTypes: ['slim', 'average'],
    hairStyles: ['cropped', 'side-part', 'ponytail'],
    sleeves: ['long'],
    skinIndices: [1, 2, 3],
  },
  {
    archetype: 'worker',
    weight: 10,
    bodyTypes: ['average', 'broad'],
    hairStyles: ['bald', 'cropped'],
    sleeves: ['long'],
    skinIndices: [0, 1, 2],
  },
  {
    archetype: 'athletic',
    weight: 10,
    bodyTypes: ['slim', 'average'],
    hairStyles: ['cropped', 'ponytail'],
    sleeves: ['short'],
    skinIndices: [0, 2, 3],
  },
  {
    archetype: 'medical',
    weight: 8,
    bodyTypes: ['slim', 'average'],
    hairStyles: ['cropped', 'side-part', 'ponytail'],
    sleeves: ['short', 'long'],
    skinIndices: [1, 2],
  },
] as const;
const POSTURES = [
  {
    upperElbowX: 0, upperElbowY: 0, upperHandX: 0, upperHandY: 0,
    lowerElbowX: 0, lowerElbowY: 0, lowerHandX: 0, lowerHandY: 0,
  },
  {
    upperElbowX: -2, upperElbowY: -2, upperHandX: 1, upperHandY: -1,
    lowerElbowX: 2, lowerElbowY: -1, lowerHandX: 3, lowerHandY: -3,
  },
  {
    upperElbowX: 2, upperElbowY: 3, upperHandX: -3, upperHandY: 2,
    lowerElbowX: -3, lowerElbowY: 2, lowerHandX: -1, lowerHandY: 2,
  },
  {
    upperElbowX: -1, upperElbowY: 2, upperHandX: 2, upperHandY: 3,
    lowerElbowX: 1, lowerElbowY: -3, lowerHandX: -3, lowerHandY: -2,
  },
] as const;

function mixUint32(value: number): number {
  let mixed = value >>> 0;
  mixed = Math.imul(mixed ^ (mixed >>> 16), 0x45d9f3b);
  mixed = Math.imul(mixed ^ (mixed >>> 16), 0x45d9f3b);
  return (mixed ^ (mixed >>> 16)) >>> 0;
}

function appearanceChannel(seed: number, spawnIndex: number, channel: number): number {
  return mixUint32(
    (seed >>> 0)
      ^ Math.imul(spawnIndex + 1, 0x9e3779b9)
      ^ Math.imul(channel + 1, 0x85ebca6b),
  );
}

export function createZombieAppearance(
  seed: number,
  spawnIndex: number,
): ZombieAppearance {
  const index = Math.max(0, Math.floor(spawnIndex));
  const choose = <T>(values: readonly T[], channel: number): T => (
    values[appearanceChannel(seed, index, channel) % values.length]
  );
  const totalWeight = ARCHETYPE_PRESETS.reduce(
    (sum, preset) => sum + preset.weight,
    0,
  );
  let weightedValue = appearanceChannel(seed, index, 0) % totalWeight;
  const preset = ARCHETYPE_PRESETS.find(({ weight }) => {
    if (weightedValue < weight) return true;
    weightedValue -= weight;
    return false;
  }) ?? ARCHETYPE_PRESETS[0];
  const palettes: readonly { readonly base: number; readonly detail: number }[] = (
    ZOMBIE_OUTFIT_PALETTES[preset.archetype]
  );
  const skinIndex = choose(preset.skinIndices, 5);

  return {
    archetype: preset.archetype,
    bodyType: choose(preset.bodyTypes, 1),
    hair: choose(preset.hairStyles, 2),
    sleeves: choose(preset.sleeves, 3),
    tornSide: appearanceChannel(seed, index, 4) % 2 === 0 ? 'upper' : 'lower',
    skin: ZOMBIE_SKIN_PALETTES[skinIndex],
    clothing: choose(palettes, 6),
    hairColor: choose(ZOMBIE_HAIR_COLORS, 7),
    posture: choose(POSTURES, 8),
  };
}

export function zombieAppearanceSeedFromId(id: string): number {
  let hash = 0x811c9dc5;
  for (let index = 0; index < id.length; index += 1) {
    hash ^= id.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}
