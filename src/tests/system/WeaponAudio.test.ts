import { describe, expect, it } from 'vitest';

import { WeaponAudio } from '../../effects/WeaponAudio';

interface ScheduledAudio {
  delay: number;
  removed: boolean;
  run(): void;
}

function createAudioRuntime() {
  const played: string[] = [];
  const stopped: string[] = [];
  const scheduled: ScheduledAudio[] = [];
  const runtime = {
    sound: {
      play: (key: string) => {
        played.push(key);
      },
      stopByKey: (key: string) => {
        stopped.push(key);
      },
    },
    time: {
      delayedCall: (delay: number, callback: () => void) => {
        const event: ScheduledAudio = {
          delay,
          removed: false,
          run: () => {
            if (!event.removed) callback();
          },
        };
        scheduled.push(event);
        return {
          remove: () => {
            event.removed = true;
          },
        };
      },
    },
  };

  return { runtime, played, stopped, scheduled };
}

describe('WeaponAudio', () => {
  it('plays the first overdue burst cue at the render boundary', () => {
    const { runtime, played, scheduled } = createAudioRuntime();
    const audio = new WeaponAudio(runtime);

    audio.queueShot('burstRifle', 65);
    audio.flushQueuedShots();

    expect(played).toHaveLength(2);
    expect(scheduled).toEqual([]);
  });

  it('preserves relative cadence between overdue burst cues', () => {
    const { runtime, played, scheduled } = createAudioRuntime();
    const audio = new WeaponAudio(runtime);

    audio.queueShot('burstRifle', 65);
    audio.queueShot('burstRifle', 130);
    audio.flushQueuedShots();

    expect(played).toHaveLength(2);
    expect(scheduled.map(({ delay }) => delay)).toEqual([65]);

    scheduled[0].run();
    expect(played).toHaveLength(4);
  });

  it('preserves spacing between reload cues caught up in one render', () => {
    const { runtime, played, scheduled } = createAudioRuntime();
    const audio = new WeaponAudio(runtime);

    audio.playReload('burstRifle', 1_000);
    audio.advanceReload(1_000);
    audio.flushQueuedReloadCues();

    expect(played).toHaveLength(2);
    expect(scheduled.map(({ delay }) => delay)).toEqual([260, 560]);

    scheduled[0].run();
    scheduled[1].run();
    expect(played).toHaveLength(4);
  });

  it('keeps newly due reload cues behind timers from an earlier flush', () => {
    const { runtime, played, scheduled } = createAudioRuntime();
    const audio = new WeaponAudio(runtime);

    audio.playReload('burstRifle', 1_000);
    audio.advanceReload(600);
    audio.flushQueuedReloadCues();
    audio.advanceReload(220);
    audio.flushQueuedReloadCues();

    expect(played).toHaveLength(2);
    expect(scheduled.map(({ delay }) => delay)).toEqual([260, 340]);

    scheduled[0].run();
    scheduled[1].run();
    expect(played).toHaveLength(4);
  });

  it('cancels queued reload cues when gameplay ends', () => {
    const { runtime, played, scheduled } = createAudioRuntime();
    const audio = new WeaponAudio(runtime);

    audio.playReload('burstRifle', 1_000);
    audio.advanceReload(1_000);
    audio.flushQueuedReloadCues();
    const playedBeforeCancel = [...played];
    audio.cancelReload();
    for (const event of scheduled) event.run();

    expect(scheduled.every(({ removed }) => removed)).toBe(true);
    expect(played).toEqual(playedBeforeCancel);
  });
});
