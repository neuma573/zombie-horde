import { ITEM_BALANCE_CONFIG } from './itemConfig';
import type { ConsumableItemKind } from '../logic/item';

export const DEBUG_CONSUMABLES = {
  pistolAmmo: { name: '9mm ammunition', amount: ITEM_BALANCE_CONFIG.pistolAmmoAmount },
  rifleAmmo: { name: 'Rifle ammunition', amount: ITEM_BALANCE_CONFIG.rifleAmmoAmount },
  shotgunAmmo: { name: 'Shotgun shells', amount: ITEM_BALANCE_CONFIG.shotgunAmmoAmount },
  medical: { name: 'Medical kit', amount: ITEM_BALANCE_CONFIG.medicalHealingAmount },
} satisfies Record<ConsumableItemKind, { name: string; amount: number }>;

// Discover source assets so newly added images and sounds automatically appear.
export const DEBUG_FILE_ASSETS = import.meta.glob<string>(
  '../assets/**/*.{png,webp,svg,jpg,jpeg,gif,mp3,wav,ogg}',
  { eager: true, query: '?url', import: 'default' },
);
