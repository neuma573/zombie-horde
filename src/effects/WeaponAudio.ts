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

interface QueuedShot {
  weaponId: WeaponId;
  offsetMs: number;
}

interface ReloadTimeline {
  elapsedMs: number;
  cues: Array<{ key: string; atMs: number }>;
}

export class WeaponAudio {
  private readonly scene: WeaponAudioRuntime;
  private readonly variationIndices = new Map<WeaponId, number>();
  private shotTimers: AudioTimer[] = [];
  private queuedShots: QueuedShot[] = [];
  private reloadTimeline?: ReloadTimeline;
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

  queueShot(weaponId: WeaponId, offsetMs: number): void {
    this.queuedShots.push({
      weaponId,
      offsetMs: Math.max(0, offsetMs),
    });
  }

  flushQueuedShots(): void {
    if (this.queuedShots.length === 0) return;
    const shots = [...this.queuedShots].sort((first, second) => (
      first.offsetMs - second.offsetMs
    ));
    this.queuedShots = [];
    const firstOffsetMs = shots[0].offsetMs;

    for (const shot of shots) {
      this.playShot(shot.weaponId, shot.offsetMs - firstOffsetMs);
    }
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
    const cues: ReloadTimeline['cues'] = [];
    for (const cue of WEAPON_AUDIO_CONFIG.weapons[weaponId].reloadCues) {
      const atMs = duration * cue.at;
      if (atMs === 0) {
        this.scene.sound.play(cue.key, { volume: WEAPON_AUDIO_CONFIG.volume.reload });
        continue;
      }
      cues.push({ key: cue.key, atMs });
    }
    this.reloadTimeline = { elapsedMs: 0, cues };
  }

  advanceReload(deltaMs: number): void {
    if (!this.reloadTimeline) return;
    const endMs = this.reloadTimeline.elapsedMs + Math.max(0, deltaMs);
    const pending = [];

    for (const cue of this.reloadTimeline.cues) {
      if (cue.atMs <= endMs) {
        this.scene.sound.play(cue.key, { volume: WEAPON_AUDIO_CONFIG.volume.reload });
      } else {
        pending.push(cue);
      }
    }

    if (pending.length === 0) {
      this.reloadTimeline = undefined;
      return;
    }
    this.reloadTimeline = { elapsedMs: endMs, cues: pending };
  }

  playEquip(weaponId: WeaponId): void {
    this.cancelReload();
    this.scene.sound.play(
      WEAPON_AUDIO_CONFIG.weapons[weaponId].equipKey,
      { volume: WEAPON_AUDIO_CONFIG.volume.equip },
    );
  }

  cancelReload(): void {
    this.reloadTimeline = undefined;
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
    this.queuedShots = [];
    this.cancelReload();
    if (this.activeTailKey) {
      this.scene.sound.stopByKey(this.activeTailKey);
      this.activeTailKey = undefined;
    }
  }
}
