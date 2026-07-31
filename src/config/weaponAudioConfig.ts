import type { WeaponId } from '../logic/weapon';

import assaultRifleBoltUrl from '../assets/sounds/03_assault_rifle_reload_1_bolt.mp3';
import assaultRifleDropMagazineUrl from '../assets/sounds/01_assault_rifle_reload_1_drop_the_mag.mp3';
import assaultRifleEquipUrl from '../assets/sounds/assault_rifle_weapon_equip.mp3';
import assaultRifleGunshot01Url from '../assets/sounds/assault_rifle_gunshot_01.mp3';
import assaultRifleGunshot02Url from '../assets/sounds/assault_rifle_gunshot_02.mp3';
import assaultRifleGunshot03Url from '../assets/sounds/assault_rifle_gunshot_03.mp3';
import assaultRifleInsertMagazineUrl from '../assets/sounds/02_assault_rifle_reload_1_insert_the_mag.mp3';
import assaultRifleMagazineDrawUrl from '../assets/sounds/assault_rifle_mag_draw.mp3';
import assaultRifleTail01Url from '../assets/sounds/assault_rifle_tail_01.mp3';
import assaultRifleTail02Url from '../assets/sounds/assault_rifle_tail_02.mp3';
import handgunDropMagazineUrl from '../assets/sounds/02_drop_the_mag_handgun_reload_1.mp3';
import handgunEquipUrl from '../assets/sounds/handgun_weapon_equip.mp3';
import handgunGunshot01Url from '../assets/sounds/handgun_gunshot_01.mp3';
import handgunGunshot02Url from '../assets/sounds/handgun_gunshot_02.mp3';
import handgunGunshot03Url from '../assets/sounds/handgun_gunshot_03.mp3';
import handgunInsertMagazineUrl from '../assets/sounds/03_insert_the_mag_handgun_reload_1.mp3';
import handgunSlideLockUrl from '../assets/sounds/01_slide_lock_handgun_reload_1.mp3';
import handgunSlideReleaseUrl from '../assets/sounds/04_slide_release_handgun_reload_1.mp3';
import handgunTail01Url from '../assets/sounds/handgun_tail_01.mp3';
import handgunTail02Url from '../assets/sounds/handgun_tail_02.mp3';

interface ReloadAudioCue {
  key: string;
  at: number;
}

interface WeaponAudioDefinition {
  equipKey: string;
  shotKeys: readonly string[];
  tailKeys: readonly string[];
  reloadCues: readonly ReloadAudioCue[];
}

export const WEAPON_AUDIO_ASSETS = {
  'audio-pistol-equip': handgunEquipUrl,
  'audio-pistol-shot-01': handgunGunshot01Url,
  'audio-pistol-shot-02': handgunGunshot02Url,
  'audio-pistol-shot-03': handgunGunshot03Url,
  'audio-pistol-tail-01': handgunTail01Url,
  'audio-pistol-tail-02': handgunTail02Url,
  'audio-pistol-reload-slide-lock': handgunSlideLockUrl,
  'audio-pistol-reload-drop-magazine': handgunDropMagazineUrl,
  'audio-pistol-reload-insert-magazine': handgunInsertMagazineUrl,
  'audio-pistol-reload-slide-release': handgunSlideReleaseUrl,
  'audio-rifle-equip': assaultRifleEquipUrl,
  'audio-rifle-shot-01': assaultRifleGunshot01Url,
  'audio-rifle-shot-02': assaultRifleGunshot02Url,
  'audio-rifle-shot-03': assaultRifleGunshot03Url,
  'audio-rifle-tail-01': assaultRifleTail01Url,
  'audio-rifle-tail-02': assaultRifleTail02Url,
  'audio-rifle-reload-drop-magazine': assaultRifleDropMagazineUrl,
  'audio-rifle-reload-magazine-draw': assaultRifleMagazineDrawUrl,
  'audio-rifle-reload-insert-magazine': assaultRifleInsertMagazineUrl,
  'audio-rifle-reload-bolt': assaultRifleBoltUrl,
} as const;

export const WEAPON_AUDIO_CONFIG = {
  volume: {
    shot: 0.55,
    tail: 0.22,
    reload: 0.5,
    equip: 0.45,
  },
  weapons: {
    pistol: {
      equipKey: 'audio-pistol-equip',
      shotKeys: [
        'audio-pistol-shot-01',
        'audio-pistol-shot-02',
        'audio-pistol-shot-03',
      ],
      tailKeys: ['audio-pistol-tail-01', 'audio-pistol-tail-02'],
      reloadCues: [
        { key: 'audio-pistol-reload-slide-lock', at: 0 },
        { key: 'audio-pistol-reload-drop-magazine', at: 0.2 },
        { key: 'audio-pistol-reload-insert-magazine', at: 0.48 },
        { key: 'audio-pistol-reload-slide-release', at: 0.84 },
      ],
    },
    burstRifle: {
      equipKey: 'audio-rifle-equip',
      shotKeys: [
        'audio-rifle-shot-01',
        'audio-rifle-shot-02',
        'audio-rifle-shot-03',
      ],
      tailKeys: ['audio-rifle-tail-01', 'audio-rifle-tail-02'],
      reloadCues: [
        { key: 'audio-rifle-reload-drop-magazine', at: 0 },
        { key: 'audio-rifle-reload-magazine-draw', at: 0.26 },
        { key: 'audio-rifle-reload-insert-magazine', at: 0.52 },
        { key: 'audio-rifle-reload-bolt', at: 0.82 },
      ],
    },
  } satisfies Record<WeaponId, WeaponAudioDefinition>,
} as const;
