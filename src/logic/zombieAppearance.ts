import {
  ZOMBIE_HAIR_COLORS,
  ZOMBIE_OUTFIT_PALETTES,
  ZOMBIE_SKIN_PALETTES,
} from '../config/zombieAppearanceConfig';

export type ZombieBodyType = 'slim' | 'average' | 'broad';
export type ZombieOutfit = keyof typeof ZOMBIE_OUTFIT_PALETTES;
export type ZombieHair = 'bald' | 'cropped' | 'side-part' | 'ponytail';
export type ZombieSleeves = 'short' | 'long';
export type ZombieTornSide = 'upper' | 'lower';

export interface ZombieAppearance {
  bodyType: ZombieBodyType;
  outfit: ZombieOutfit;
  hair: ZombieHair;
  sleeves: ZombieSleeves;
  tornSide: ZombieTornSide;
  skin: (typeof ZOMBIE_SKIN_PALETTES)[number];
  clothing: (typeof ZOMBIE_OUTFIT_PALETTES)[ZombieOutfit];
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

const BODY_TYPES: readonly ZombieBodyType[] = ['slim', 'average', 'broad'];
const OUTFITS: readonly ZombieOutfit[] = ['casual', 'hoodie', 'office', 'worker'];
const HAIR_STYLES: readonly ZombieHair[] = ['bald', 'cropped', 'side-part', 'ponytail'];
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
  const outfit = choose(OUTFITS, 1);

  return {
    bodyType: choose(BODY_TYPES, 0),
    outfit,
    hair: choose(HAIR_STYLES, 2),
    sleeves: appearanceChannel(seed, index, 3) % 3 === 0 ? 'short' : 'long',
    tornSide: appearanceChannel(seed, index, 4) % 2 === 0 ? 'upper' : 'lower',
    skin: choose(ZOMBIE_SKIN_PALETTES, 5),
    clothing: ZOMBIE_OUTFIT_PALETTES[outfit],
    hairColor: choose(ZOMBIE_HAIR_COLORS, 6),
    posture: choose(POSTURES, 7),
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
