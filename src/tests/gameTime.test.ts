import { describe, expect, it } from 'vitest';

import { GAME_TIME_CONFIG } from '../config/gameTimeConfig';
import {
  advanceGameTime,
  createGameTimeState,
  formatGameTime,
} from '../logic/gameTime';

describe('game time', () => {
  it('starts at the configured time and formats it for the HUD', () => {
    const state = createGameTimeState(GAME_TIME_CONFIG);

    expect(state).toEqual({ minuteOfDay: 1_020 });
    expect(formatGameTime(state)).toBe('17:00');
  });

  it('advances ten game minutes per real second using deltaMs', () => {
    const state = advanceGameTime(
      createGameTimeState(GAME_TIME_CONFIG),
      1_000,
      GAME_TIME_CONFIG,
    );

    expect(state.minuteOfDay).toBe(1_030);
    expect(formatGameTime(state)).toBe('17:10');
  });

  it('produces the same result for a whole delta and split deltas', () => {
    const initial = createGameTimeState(GAME_TIME_CONFIG);
    const whole = advanceGameTime(initial, 7_500, GAME_TIME_CONFIG);
    const first = advanceGameTime(initial, 2_500, GAME_TIME_CONFIG);
    const split = advanceGameTime(first, 5_000, GAME_TIME_CONFIG);

    expect(split.minuteOfDay).toBeCloseTo(whole.minuteOfDay);
    expect(formatGameTime(split)).toBe(formatGameTime(whole));
  });

  it('wraps through 24 hours and consumes large deltas without a frame cap', () => {
    const initial = createGameTimeState(GAME_TIME_CONFIG);
    const elapsed = GAME_TIME_CONFIG.realMillisecondsPerGameDay * 3 + 9_000;
    const state = advanceGameTime(initial, elapsed, GAME_TIME_CONFIG);

    expect(formatGameTime(state)).toBe('18:30');
  });

  it('updates the watch display in ten-minute steps', () => {
    const initial = createGameTimeState(GAME_TIME_CONFIG);
    const beforeStep = advanceGameTime(initial, 999, GAME_TIME_CONFIG);
    const atStep = advanceGameTime(initial, 1_000, GAME_TIME_CONFIG);

    expect(formatGameTime(beforeStep)).toBe('17:00');
    expect(formatGameTime(atStep)).toBe('17:10');
  });

  it('ignores invalid or non-positive deltas', () => {
    const initial = createGameTimeState(GAME_TIME_CONFIG);

    expect(advanceGameTime(initial, 0, GAME_TIME_CONFIG)).toBe(initial);
    expect(advanceGameTime(initial, -1, GAME_TIME_CONFIG)).toBe(initial);
    expect(advanceGameTime(initial, Number.POSITIVE_INFINITY, GAME_TIME_CONFIG)).toBe(initial);
  });
});
