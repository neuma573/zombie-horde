import Phaser from 'phaser';

import {
  WEAPON_AUDIO_ASSETS,
  WEAPON_AUDIO_CONFIG,
} from '../config/weaponAudioConfig';
import type { WeaponId } from '../logic/weapon';

export class WeaponAudio {
  private readonly scene: Phaser.Scene;
  private readonly variationIndices = new Map<WeaponId, number>();
  private reloadTimers: Phaser.Time.TimerEvent[] = [];
  private activeTailKey?: string;

  static preload(scene: Phaser.Scene): void {
    for (const [key, url] of Object.entries(WEAPON_AUDIO_ASSETS)) {
      if (!scene.cache.audio.exists(key)) {
        scene.load.audio(key, url);
      }
    }
  }

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  playShot(weaponId: WeaponId): void {
    const definition = WEAPON_AUDIO_CONFIG.weapons[weaponId];
    const variationIndex = this.variationIndices.get(weaponId) ?? 0;
    const shotKey = definition.shotKeys[variationIndex % definition.shotKeys.length];
    const tailKey = definition.tailKeys[variationIndex % definition.tailKeys.length];
    this.variationIndices.set(weaponId, variationIndex + 1);

    this.scene.sound.play(shotKey, { volume: WEAPON_AUDIO_CONFIG.volume.shot });
    if (this.activeTailKey) {
      this.scene.sound.stopByKey(this.activeTailKey);
    }
    this.activeTailKey = tailKey;
    this.scene.sound.play(tailKey, { volume: WEAPON_AUDIO_CONFIG.volume.tail });
  }

  playReload(weaponId: WeaponId, durationMs: number): void {
    this.cancelReload();
    const duration = Math.max(0, durationMs);
    for (const cue of WEAPON_AUDIO_CONFIG.weapons[weaponId].reloadCues) {
      const delay = duration * cue.at;
      if (delay === 0) {
        this.scene.sound.play(cue.key, { volume: WEAPON_AUDIO_CONFIG.volume.reload });
        continue;
      }
      this.reloadTimers.push(this.scene.time.delayedCall(delay, () => {
        this.scene.sound.play(cue.key, { volume: WEAPON_AUDIO_CONFIG.volume.reload });
      }));
    }
  }

  playEquip(weaponId: WeaponId): void {
    this.cancelReload();
    this.scene.sound.play(
      WEAPON_AUDIO_CONFIG.weapons[weaponId].equipKey,
      { volume: WEAPON_AUDIO_CONFIG.volume.equip },
    );
  }

  cancelReload(): void {
    for (const timer of this.reloadTimers) {
      timer.remove(false);
    }
    this.reloadTimers = [];
    for (const definition of Object.values(WEAPON_AUDIO_CONFIG.weapons)) {
      for (const cue of definition.reloadCues) {
        this.scene.sound.stopByKey(cue.key);
      }
    }
  }

  destroy(): void {
    this.cancelReload();
    if (this.activeTailKey) {
      this.scene.sound.stopByKey(this.activeTailKey);
      this.activeTailKey = undefined;
    }
  }
}
