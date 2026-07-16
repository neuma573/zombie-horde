import { describe, expect, it } from 'vitest';

import {
  createSessionState,
  isPlaying,
  transitionToGameOver,
} from '../logic/session';

describe('game session state', () => {
  it('creates a fresh playing state for every session', () => {
    const first = createSessionState();
    const second = createSessionState();

    expect(first).toEqual({ phase: 'playing' });
    expect(second).toEqual({ phase: 'playing' });
    expect(second).not.toBe(first);
    expect(isPlaying(second)).toBe(true);
  });

  it('transitions to game over only once', () => {
    const first = transitionToGameOver(createSessionState());
    const repeated = transitionToGameOver(first.state);

    expect(first).toEqual({ state: { phase: 'gameOver' }, changed: true });
    expect(repeated).toEqual({ state: first.state, changed: false });
    expect(isPlaying(repeated.state)).toBe(false);
  });

  it('restarts by creating a new playing state instead of mutating game over', () => {
    const gameOver = transitionToGameOver(createSessionState()).state;
    const restarted = createSessionState();

    expect(gameOver).toEqual({ phase: 'gameOver' });
    expect(restarted).toEqual({ phase: 'playing' });
    expect(restarted).not.toBe(gameOver);
  });
});
