import Phaser from 'phaser';

import {
  WEAPON_AUDIO_ASSETS,
  WEAPON_AUDIO_CONFIG,
} from '../config/weaponAudioConfig';
import type { WeaponId } from '../logic/weapon';

interface AudioTimer {
  remove(dispatchCallback?: boolean): void;
}

interface WeaponAudioRuntime {
  sound: {
    play(key: string, config: { volume: number }): unknown;
    stopByKey(key: string): unknown;
  };
  time: {
    delayedCall(delay: number, callback: () => void): AudioTimer;
  };
}

export class WeaponAudio {
  private readonly scene: WeaponAudioRuntime;
  private readonly variationIndices = new Map<WeaponId, number>();
  private shotTimers: AudioTimer[] = [];
  private reloadTimers: AudioTimer[] = [];
  private activeTailKey?: string;

  static preload(scene: Phaser.Scene): void {
    for (const [key, url] of Object.entries(WEAPON_AUDIO_ASSETS)) {
      if (!scene.cache.audio.exists(key)) {
        scene.load.audio(key, url);
      }
    }
  }

  constructor(scene: WeaponAudioRuntime) {
    this.scene = scene;
  }

  playShot(weaponId: WeaponId, delayMs = 0): void {
    const delay = Math.max(0, delayMs);
    if (delay === 0) {
      this.playShotNow(weaponId);
      return;
    }
    const timer = this.scene.time.delayedCall(delay, () => {
      this.shotTimers = this.shotTimers.filter((queued) => queued !== timer);
      this.playShotNow(weaponId);
    });
    this.shotTimers.push(timer);
  }

  private playShotNow(weaponId: WeaponId): void {
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
    for (const timer of this.shotTimers) {
      timer.remove(false);
    }
    this.shotTimers = [];
    this.cancelReload();
    if (this.activeTailKey) {
      this.scene.sound.stopByKey(this.activeTailKey);
      this.activeTailKey = undefined;
    }
  }
}
