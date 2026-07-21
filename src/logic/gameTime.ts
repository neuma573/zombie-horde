const GAME_HOURS_PER_DAY = 24;
const GAME_MINUTES_PER_HOUR = 60;
const GAME_MINUTES_PER_DAY = GAME_HOURS_PER_DAY * GAME_MINUTES_PER_HOUR;
const DISPLAY_MINUTE_STEP = 10;

export interface GameTimeConfig {
  startMinuteOfDay: number;
  realMillisecondsPerGameHour: number;
  realMillisecondsPerGameDay: number;
}

export interface GameTimeState {
  minuteOfDay: number;
}

export function createGameTimeState(config: GameTimeConfig): GameTimeState {
  return { minuteOfDay: wrapMinuteOfDay(config.startMinuteOfDay) };
}

export function advanceGameTime(
  state: GameTimeState,
  deltaMs: number,
  config: GameTimeConfig,
): GameTimeState {
  if (
    !Number.isFinite(deltaMs)
    || deltaMs <= 0
    || !Number.isFinite(config.realMillisecondsPerGameHour)
    || config.realMillisecondsPerGameHour <= 0
    || !Number.isFinite(config.realMillisecondsPerGameDay)
    || config.realMillisecondsPerGameDay <= 0
  ) {
    return state;
  }

  const deltaWithinDay = deltaMs % config.realMillisecondsPerGameDay;
  const elapsedGameMinutes = deltaWithinDay
    / config.realMillisecondsPerGameHour
    * GAME_MINUTES_PER_HOUR;

  return {
    minuteOfDay: wrapMinuteOfDay(state.minuteOfDay + elapsedGameMinutes),
  };
}

export function formatGameTime(state: GameTimeState): string {
  const wholeMinute = Math.floor(
    wrapMinuteOfDay(state.minuteOfDay) / DISPLAY_MINUTE_STEP,
  ) * DISPLAY_MINUTE_STEP;
  const hour = Math.floor(wholeMinute / GAME_MINUTES_PER_HOUR);
  const minute = wholeMinute % GAME_MINUTES_PER_HOUR;

  return `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
}

function wrapMinuteOfDay(minute: number): number {
  if (!Number.isFinite(minute)) return 0;
  return ((minute % GAME_MINUTES_PER_DAY) + GAME_MINUTES_PER_DAY) % GAME_MINUTES_PER_DAY;
}
