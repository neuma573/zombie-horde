import type { SessionPhase } from './session';
import type { WavePhase } from './wave';
import type { WeaponId, WeaponRarity } from './weapon';

export interface HudState {
  health: number;
  maxHealth: number;
  magazineAmmo: number;
  reserveAmmo: number;
  isReloading: boolean;
  reloadProgress: number;
  waveNumber: number;
  wavePhase: WavePhase;
  waveTimerMs: number;
  remainingToSpawn: number;
  aliveZombieCount: number;
  killCount: number;
  sessionPhase: SessionPhase;
  gameTimeText: string;
  weaponSlots?: Array<{
    id: WeaponId;
    name: string;
    description: string;
    rarity: WeaponRarity;
    fireRateText: string;
    recoil: number;
    magazineSize: number;
  } | null>;
  activeWeaponSlot?: 0 | 1;
}

export interface HudViewModel {
  statusText: string;
  ammoText: string;
  timeText: string;
  gameOverText: string;
  showGameOver: boolean;
  reloadProgress: number | null;
  reloadPrompt: string | null;
  waveNumber: number;
  waveBannerText: string | null;
  weaponSlots: Array<{
    id: WeaponId;
    name: string;
    description: string;
    rarity: WeaponRarity;
    fireRateText: string;
    recoil: number;
    magazineSize: number;
  } | null>;
  activeWeaponSlot: 0 | 1;
}

export interface WeaponPickupViewModel {
  name: string;
  description: string;
  rarity: WeaponRarity;
  fireRateText: string;
  recoil: number;
  magazineSize: number;
  interactionText: string;
}

export type TooltipPlacement = 'above' | 'below';
export type WeaponSlotIndex = 0 | 1;

const TOOLTIP_EDGE_MARGIN = 8;
const TOOLTIP_HORIZONTAL_PADDING = 16;
const TOOLTIP_PREFERRED_TEXT_WIDTH = 260;

export function constrainTooltipWidths(
  viewportWidth: number,
  safeArea: Pick<SafeAreaInsets, 'left' | 'right'> = { left: 0, right: 0 },
): {
  panelMaxWidth: number;
  textWrapWidth: number;
} {
  const safeViewportWidth = Math.max(
    0,
    viewportWidth - Math.max(0, safeArea.left) - Math.max(0, safeArea.right),
  );
  const panelMaxWidth = Math.max(
    0,
    safeViewportWidth - TOOLTIP_EDGE_MARGIN * 2,
  );
  const textWrapWidth = Math.max(
    0,
    Math.min(
      TOOLTIP_PREFERRED_TEXT_WIDTH,
      panelMaxWidth - TOOLTIP_HORIZONTAL_PADDING * 2,
    ),
  );

  return { panelMaxWidth, textWrapWidth };
}

export function handleWeaponSlotPress(
  slot: WeaponSlotIndex,
  stopPropagation: () => void,
  selectSlot: (slot: WeaponSlotIndex) => void,
): void {
  stopPropagation();
  selectSlot(slot);
}

export function positionTooltip(
  anchor: { x: number; y: number },
  panel: { width: number; height: number },
  viewport: { width: number; height: number },
  placement: TooltipPlacement,
  safeArea: SafeAreaInsets = { top: 0, right: 0, bottom: 0, left: 0 },
): { x: number; y: number } {
  const edge = TOOLTIP_EDGE_MARGIN;
  const gap = 18;
  const safeLeft = Math.max(0, safeArea.left);
  const safeRight = Math.max(0, safeArea.right);
  const safeTop = Math.max(0, safeArea.top);
  const safeBottom = Math.max(0, safeArea.bottom);
  const desiredY = placement === 'above'
    ? anchor.y - panel.height / 2 - gap
    : anchor.y + panel.height / 2 + gap;
  const minimumX = panel.width / 2 + safeLeft + edge;
  const minimumY = panel.height / 2 + safeTop + edge;

  return {
    x: Math.min(
      Math.max(minimumX, anchor.x),
      Math.max(
        minimumX,
        viewport.width - safeRight - panel.width / 2 - edge,
      ),
    ),
    y: Math.min(
      Math.max(minimumY, desiredY),
      Math.max(
        minimumY,
        viewport.height - safeBottom - panel.height / 2 - edge,
      ),
    ),
  };
}

export interface SafeAreaInsets {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export interface HudLayout {
  status: { x: number; y: number };
  ammo: { x: number; y: number };
  time: { x: number; y: number; width: number; height: number };
  gameOver: { x: number; y: number };
  reload: { x: number; y: number; width: number; height: number };
  waveBanner: { x: number; y: number };
}

const HUD_MARGIN = 12;
const WATCH_SIDE_GAP = 8;
const RELOAD_WIDTH_RATIO = 0.34;
const RELOAD_MIN_WIDTH = 150;
const RELOAD_MAX_WIDTH = 320;
const RELOAD_HEIGHT = 10;
const WATCH_WIDTH = 116;
const WATCH_HEIGHT = 48;
const WAVE_BANNER_HALF_HEIGHT = 24;

export function createHudViewModel(state: HudState): HudViewModel {
  const remainingEnemies = Math.max(0, state.remainingToSpawn)
    + Math.max(0, state.aliveZombieCount);
  const waveStatus = state.waveNumber > 0
    ? `WAVE ${state.waveNumber}  LEFT ${remainingEnemies}`
    : 'WAVE --';
  const nextWaveNumber = state.waveNumber + 1;
  const countdownSeconds = Math.max(0, Math.ceil(state.waveTimerMs / 1_000));
  const waveBannerText = state.sessionPhase === 'playing' && state.wavePhase === 'waiting'
    ? state.waveNumber === 0
      ? `PREPARE\nWAVE ${nextWaveNumber} IN ${countdownSeconds}`
      : `WAVE ${state.waveNumber} CLEAR\nNEXT WAVE IN ${countdownSeconds}`
    : null;

  return {
    statusText: [
      `HP ${state.health}/${state.maxHealth}`,
      waveStatus,
      `KILLS ${state.killCount}`,
    ].join('\n'),
    ammoText: `${state.magazineAmmo} / ${state.reserveAmmo}`,
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
    waveNumber: state.waveNumber,
    waveBannerText,
    weaponSlots: state.weaponSlots ?? [null, null],
    activeWeaponSlot: state.activeWeaponSlot ?? 0,
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
  const gameOverY = Math.min(safeBottom, Math.max(safeTop, (safeTop + safeBottom) / 2));
  const watchWidth = Math.min(WATCH_WIDTH, usableWidth);
  const watchCenterX = safeLeft + usableWidth / 2;
  const waveBannerMinY = Math.min(safeBottom, safeTop + WAVE_BANNER_HALF_HEIGHT);
  const waveBannerMaxY = Math.max(
    waveBannerMinY,
    safeBottom - WAVE_BANNER_HALF_HEIGHT,
  );
  const waveBannerY = Math.min(
    waveBannerMaxY,
    Math.max(waveBannerMinY, safeTop + WATCH_HEIGHT + 32, gameOverY - 72),
  );
  const reloadWidth = Math.max(0, Math.min(
    RELOAD_MAX_WIDTH,
    Math.max(RELOAD_MIN_WIDTH, usableWidth * RELOAD_WIDTH_RATIO),
    usableWidth,
  ));

  return {
    status: {
      x: watchCenterX - watchWidth / 2 - WATCH_SIDE_GAP,
      y: safeTop,
    },
    ammo: {
      x: watchCenterX + watchWidth / 2 + WATCH_SIDE_GAP,
      y: safeTop + 14,
    },
    time: {
      x: watchCenterX,
      y: safeTop,
      width: watchWidth,
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
    waveBanner: {
      x: safeLeft + usableWidth / 2,
      y: waveBannerY,
    },
  };
}
