import type { GameTimeConfig } from '../logic/gameTime';

const REAL_MILLISECONDS_PER_GAME_HOUR = 60_000;

export const GAME_TIME_CONFIG = {
  startMinuteOfDay: 9 * 60,
  realMillisecondsPerGameHour: REAL_MILLISECONDS_PER_GAME_HOUR,
  realMillisecondsPerGameDay: REAL_MILLISECONDS_PER_GAME_HOUR * 24,
} satisfies GameTimeConfig;
