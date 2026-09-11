import { PISTOL_WEAPON, BURST_RIFLE_WEAPON, DOUBLE_BARREL_SHOTGUN_WEAPON } from './weaponConfig';

// Two columns leave the player's spawn clear and fit narrow starting viewports.
export const STARTING_WEAPON_PICKUPS = [
  { definition: PISTOL_WEAPON, offset: { x: -88, y: -88 } },
  { definition: PISTOL_WEAPON, offset: { x: 88, y: -88 } },
  { definition: BURST_RIFLE_WEAPON, offset: { x: -88, y: 0 } },
  { definition: BURST_RIFLE_WEAPON, offset: { x: 88, y: 0 } },
  { definition: DOUBLE_BARREL_SHOTGUN_WEAPON, offset: { x: -88, y: 88 } },
  { definition: DOUBLE_BARREL_SHOTGUN_WEAPON, offset: { x: 88, y: 88 } },
] as const;

export const STARTING_SUPPLY_OFFSET = { x: 0, y: 150 } as const;
