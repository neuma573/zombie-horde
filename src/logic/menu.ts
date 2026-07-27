import {
  CHARACTER_CLASS_OPTIONS,
  type CharacterClassId,
} from '../config/menuConfig';

export interface GameSettings {
  soundEnabled: boolean;
}

export interface MenuActionLayout {
  back: { x: number; width: number };
  deploy: { x: number; width: number };
}

export interface MobileClassCardLayout {
  cardHeight: number;
  cardCenters: [number, number];
  cardBottom: number;
}

const MENU_ACTION_GAP = 12;
const BACK_BUTTON_MAX_WIDTH = 140;
const DEPLOY_BUTTON_MAX_WIDTH = 160;
const MENU_ACTION_HEIGHT = 46;
const CLASS_STATUS_GAP = 9;
const CLASS_STATUS_HALF_HEIGHT = 6;

export function toggleSound(settings: GameSettings): GameSettings {
  return {
    ...settings,
    soundEnabled: !settings.soundEnabled,
  };
}

export function selectCharacterClass(
  current: CharacterClassId | null,
  requested: string,
): CharacterClassId | null {
  const option = CHARACTER_CLASS_OPTIONS.find(({ id }) => id === requested);
  return option?.id ?? current;
}

export function createMenuActionLayout(left: number, right: number): MenuActionLayout {
  const safeLeft = Math.min(left, right);
  const safeRight = Math.max(left, right);
  const availableWidth = Math.max(0, safeRight - safeLeft - MENU_ACTION_GAP);
  const backWidth = Math.min(BACK_BUTTON_MAX_WIDTH, availableWidth / 2);
  const deployWidth = Math.min(DEPLOY_BUTTON_MAX_WIDTH, availableWidth - backWidth);

  return {
    back: {
      x: safeLeft + backWidth / 2,
      width: backWidth,
    },
    deploy: {
      x: safeRight - deployWidth / 2,
      width: deployWidth,
    },
  };
}

export function clampClassStatusY(
  preferredY: number,
  nameY: number,
  actionY: number,
): number {
  const actionTop = actionY - MENU_ACTION_HEIGHT / 2;
  const maximumY = actionTop - CLASS_STATUS_GAP - CLASS_STATUS_HALF_HEIGHT;
  return preferredY <= maximumY
    ? preferredY
    : Math.min(nameY - 18, maximumY);
}

export function createMobileClassCardLayout(
  cardTop: number,
  cardBottom: number,
  requestedGap: number,
): MobileClassCardLayout {
  const availableHeight = Math.max(0, cardBottom - cardTop);
  const gap = Math.min(Math.max(0, requestedGap), availableHeight);
  const cardHeight = Math.max(0, (availableHeight - gap) / 2);

  return {
    cardHeight,
    cardCenters: [
      cardTop + cardHeight / 2,
      cardTop + cardHeight * 1.5 + gap,
    ],
    cardBottom: cardTop + cardHeight * 2 + gap,
  };
}
