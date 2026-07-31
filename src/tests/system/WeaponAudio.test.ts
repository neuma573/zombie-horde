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

  it('advances reload cues with simulated time without Scene timers', () => {
    const { runtime, played, scheduled } = createAudioRuntime();
    const audio = new WeaponAudio(runtime);

    audio.playReload('burstRifle', 1_000);
    audio.advanceReload(1_000);

    expect(played).toHaveLength(4);
    expect(scheduled).toEqual([]);
  });

  it('cancels reload cues before simulated time reaches them', () => {
    const { runtime, played } = createAudioRuntime();
    const audio = new WeaponAudio(runtime);

    audio.playReload('burstRifle', 1_000);
    const playedBeforeCancel = [...played];
    audio.cancelReload();
    audio.advanceReload(1_000);

    expect(played).toEqual(playedBeforeCancel);
  });
});
