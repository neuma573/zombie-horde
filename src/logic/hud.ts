import type { SessionPhase } from './session';
import type { WavePhase } from './wave';

export interface HudState {
  health: number;
  maxHealth: number;
  magazineAmmo: number;
  reserveAmmo: number;
  isReloading: boolean;
  waveNumber: number;
  wavePhase: WavePhase;
  aliveZombieCount: number;
  sessionPhase: SessionPhase;
}

export interface HudViewModel {
  playerText: string;
  waveText: string;
  gameOverText: string;
  showGameOver: boolean;
}

export interface SafeAreaInsets {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export interface HudLayout {
  player: { x: number; y: number };
  wave: { x: number; y: number; alignRight: boolean };
  gameOver: { x: number; y: number };
}

const HUD_MARGIN = 12;
const PLAYER_BLOCK_HEIGHT = 60;
const STACK_GAP = 8;
const WIDE_LAYOUT_MIN_WIDTH = 560;

export function createHudViewModel(state: HudState): HudViewModel {
  const waveStatus = state.wavePhase === 'waiting'
    ? 'Next wave incoming'
    : state.wavePhase === 'spawning'
      ? 'Wave spawning'
      : 'Defend';

  return {
    playerText: [
      `HP ${state.health}/${state.maxHealth}`,
      `Ammo ${state.magazineAmmo}/${state.reserveAmmo}`,
      `Reload ${state.isReloading ? 'In progress' : 'Ready'}`,
    ].join('\n'),
    waveText: [
      `Wave ${state.waveNumber}`,
      `Zombies ${state.aliveZombieCount}`,
      waveStatus,
    ].join('\n'),
    gameOverText: 'GAME OVER\nEnter or tap to restart',
    showGameOver: state.sessionPhase === 'gameOver',
  };
}

export function createHudLayout(
  width: number,
  height: number,
  safeArea: SafeAreaInsets,
): HudLayout {
  const safeLeft = Math.max(0, safeArea.left) + HUD_MARGIN;
  const safeRight = Math.max(safeLeft, width - Math.max(0, safeArea.right) - HUD_MARGIN);
  const safeTop = Math.max(0, safeArea.top) + HUD_MARGIN;
  const safeBottom = Math.max(safeTop, height - Math.max(0, safeArea.bottom) - HUD_MARGIN);
  const usableWidth = Math.max(0, safeRight - safeLeft);
  const stacked = usableWidth < WIDE_LAYOUT_MIN_WIDTH;
  const waveY = stacked ? safeTop + PLAYER_BLOCK_HEIGHT + STACK_GAP : safeTop;
  const gameOverY = Math.min(safeBottom, Math.max(safeTop, (safeTop + safeBottom) / 2));

  return {
    player: { x: safeLeft, y: safeTop },
    wave: {
      x: stacked ? safeLeft : safeRight,
      y: waveY,
      alignRight: !stacked,
    },
    gameOver: {
      x: safeLeft + usableWidth / 2,
      y: gameOverY,
    },
  };
}
