import crosswalkUrl from '../assets/crosswalk.svg';
import noStoppingZoneUrl from '../assets/no_stopping_zone_transparent.svg';
import roadDiamondOutlineUrl from '../assets/road_diamond_outline.svg';
import pistolIconUrl from '../assets/weapons/pistol.png';
import rifleIconUrl from '../assets/weapons/rifle.png';
import shotgunIconUrl from '../assets/weapons/double-barrel-shotgun.png';
import policeBatonIconUrl from '../assets/weapons/police-baton.png';
import pistolAmmoUrl from '../assets/weapons/ammo-9mm-hud.svg';
import rifleAmmoUrl from '../assets/weapons/ammo-556-hud.svg';
import shotgunAmmoUrl from '../assets/weapons/ammo-12-gauge-hud.svg';
import mainMenuBackgroundUrl from '../assets/mainmenu.webp';
import mainMenuMobileBackgroundUrl from '../assets/mainmenu-mobile.webp';
import mainMenuLogoUrl from '../assets/logo.webp';
import { CHARACTER_CLASS_OPTIONS } from '../config/menuConfig';
import { WEAPON_AUDIO_ASSETS } from '../config/weaponAudioConfig';

export const CROSSWALK_TEXTURE_KEY = 'crosswalk';
export const NO_STOPPING_ZONE_TEXTURE_KEY = 'no-stopping-zone';
export const ROAD_DIAMOND_OUTLINE_TEXTURE_KEY = 'road-diamond-outline';
export const MAIN_MENU_BACKGROUND_TEXTURE_KEY = 'main-menu-background';
export const MAIN_MENU_MOBILE_BACKGROUND_TEXTURE_KEY = 'main-menu-mobile-background';
export const MAIN_MENU_LOGO_TEXTURE_KEY = 'main-menu-logo';

export const GAME_IMAGE_ASSETS = {
  [MAIN_MENU_BACKGROUND_TEXTURE_KEY]: mainMenuBackgroundUrl,
  [MAIN_MENU_MOBILE_BACKGROUND_TEXTURE_KEY]: mainMenuMobileBackgroundUrl,
  [MAIN_MENU_LOGO_TEXTURE_KEY]: mainMenuLogoUrl,
  [CROSSWALK_TEXTURE_KEY]: crosswalkUrl,
  [NO_STOPPING_ZONE_TEXTURE_KEY]: noStoppingZoneUrl,
  [ROAD_DIAMOND_OUTLINE_TEXTURE_KEY]: roadDiamondOutlineUrl,
  'weapon-pistol': pistolIconUrl,
  'weapon-rifle': rifleIconUrl,
  'weapon-shotgun': shotgunIconUrl,
  'weapon-police-baton': policeBatonIconUrl,
  'ammo-pistol': pistolAmmoUrl,
  'ammo-rifle': rifleAmmoUrl,
  'ammo-shotgun': shotgunAmmoUrl,
} as const;

interface GameAssetPreloadRuntime {
  textures: {
    exists(key: string): boolean;
  };
  cache: {
    audio: {
      exists(key: string): boolean;
    };
  };
  load: {
    image(key: string, url: string): unknown;
    audio(key: string, url: string): unknown;
  };
}

export function preloadGameAssets(scene: GameAssetPreloadRuntime): void {
  for (const option of CHARACTER_CLASS_OPTIONS) {
    if (
      option.portraitUrl
      && !scene.textures.exists(option.portraitTextureKey)
    ) {
      scene.load.image(option.portraitTextureKey, option.portraitUrl);
    }
  }

  for (const [key, url] of Object.entries(GAME_IMAGE_ASSETS)) {
    if (!scene.textures.exists(key)) scene.load.image(key, url);
  }

  for (const [key, url] of Object.entries(WEAPON_AUDIO_ASSETS)) {
    if (!scene.cache.audio.exists(key)) scene.load.audio(key, url);
  }
}
