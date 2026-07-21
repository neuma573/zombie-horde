import type { SessionPhase } from './session';
import type { WavePhase } from './wave';

export interface HudState {
  health: number;
  maxHealth: number;
  magazineAmmo: number;
  reserveAmmo: number;
  isReloading: boolean;
  reloadProgress: number;
  waveNumber: number;
  wavePhase: WavePhase;
  aliveZombieCount: number;
  sessionPhase: SessionPhase;
  gameTimeText: string;
}

export interface HudViewModel {
  playerText: string;
  waveText: string;
  timeText: string;
  gameOverText: string;
  showGameOver: boolean;
  reloadProgress: number | null;
  reloadPrompt: string | null;
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
  time: { x: number; y: number; width: number; height: number };
  gameOver: { x: number; y: number };
  reload: { x: number; y: number; width: number; height: number };
}

const HUD_MARGIN = 12;
const PLAYER_BLOCK_HEIGHT = 60;
const STACK_GAP = 8;
const WIDE_LAYOUT_MIN_WIDTH = 560;
const RELOAD_WIDTH_RATIO = 0.34;
const RELOAD_MIN_WIDTH = 150;
const RELOAD_MAX_WIDTH = 320;
const RELOAD_HEIGHT = 10;
const WATCH_WIDTH = 116;
const WATCH_HEIGHT = 48;

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
    timeText: state.gameTimeText,
    gameOverText: 'GAME OVER\nEnter or tap to restart',
    showGameOver: state.sessionPhase === 'gameOver',
    reloadProgress: state.isReloading && state.sessionPhase === 'playing'
      ? Math.min(1, Math.max(0, state.reloadProgress))
      : null,
    reloadPrompt: state.sessionPhase === 'playing'
      && !state.isReloading
      && state.magazineAmmo === 0
      && state.reserveAmmo > 0
      ? 'RELOAD'
      : null,
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
  const reloadWidth = Math.max(0, Math.min(
    RELOAD_MAX_WIDTH,
    Math.max(RELOAD_MIN_WIDTH, usableWidth * RELOAD_WIDTH_RATIO),
    usableWidth,
  ));

  return {
    player: { x: safeLeft, y: safeTop },
    wave: {
      x: stacked ? safeLeft : safeRight,
      y: waveY,
      alignRight: !stacked,
    },
    time: {
      x: safeLeft + usableWidth / 2,
      y: safeTop,
      width: Math.min(WATCH_WIDTH, usableWidth),
      height: WATCH_HEIGHT,
    },
    gameOver: {
      x: safeLeft + usableWidth / 2,
      y: gameOverY,
    },
    reload: {
      x: safeLeft + (usableWidth - reloadWidth) / 2,
      y: Math.min(safeBottom - RELOAD_HEIGHT, Math.max(safeTop + 24, gameOverY + 48)),
      width: reloadWidth,
      height: RELOAD_HEIGHT,
    },
  };
}
