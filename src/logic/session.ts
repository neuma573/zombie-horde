export type SessionPhase = 'playing' | 'gameOver';

export interface SessionState {
  phase: SessionPhase;
}

export interface GameOverTransition {
  state: SessionState;
  changed: boolean;
}

export function createSessionState(): SessionState {
  return { phase: 'playing' };
}

export function transitionToGameOver(state: SessionState): GameOverTransition {
  if (state.phase === 'gameOver') {
    return { state, changed: false };
  }

  return {
    state: { phase: 'gameOver' },
    changed: true,
  };
}

export function isPlaying(state: SessionState): boolean {
  return state.phase === 'playing';
}
