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
  it('delays a burst cue until its simulated firing offset', () => {
    const { runtime, played, scheduled } = createAudioRuntime();
    const audio = new WeaponAudio(runtime);

    audio.playShot('burstRifle', 65);

    expect(played).toEqual([]);
    expect(scheduled.map(({ delay }) => delay)).toEqual([65]);

    scheduled[0].run();
    expect(played).toHaveLength(2);
  });

  it('cancels queued reload cues before they can play', () => {
    const { runtime, played, scheduled } = createAudioRuntime();
    const audio = new WeaponAudio(runtime);

    audio.playReload('burstRifle', 1_000);
    const playedBeforeCancel = [...played];
    audio.cancelReload();
    for (const event of scheduled) event.run();

    expect(scheduled.every(({ removed }) => removed)).toBe(true);
    expect(played).toEqual(playedBeforeCancel);
  });
});
