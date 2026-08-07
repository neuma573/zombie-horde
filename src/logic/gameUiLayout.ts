import { createHudLayout, type HudLayout, type SafeAreaInsets } from './hud';
import { createMobileControlLayout, type MobileControlLayout } from './mobileInput';

export const MINIMUM_SUPPORTED_VIEWPORT = {
  width: 320,
  height: 360,
} as const;

export interface GameUiLayoutInput {
  width: number;
  height: number;
  safeArea: SafeAreaInsets;
  mobileControls: boolean;
}

export interface UiBounds {
  left: number;
  right: number;
  top: number;
  bottom: number;
}

export interface GameUiLayout extends GameUiLayoutInput {
  hud: HudLayout;
  pauseButton: UiBounds | null;
  mobileControlsLayout: MobileControlLayout | null;
  supportedViewport: boolean;
}

function overlaps(left: UiBounds, right: UiBounds): boolean {
  return left.left < right.right
    && left.right > right.left
    && left.top < right.bottom
    && left.bottom > right.top;
}

function circleBounds(circle: { x: number; y: number; radius: number }): UiBounds {
  return {
    left: circle.x - circle.radius,
    right: circle.x + circle.radius,
    top: circle.y - circle.radius,
    bottom: circle.y + circle.radius,
  };
}

function pauseBounds(
  input: GameUiLayoutInput,
  hud: HudLayout,
  mobileLayout: MobileControlLayout | null,
): UiBounds | null {
  if (!input.mobileControls) return null;

  const left = Math.min(input.width, Math.max(0, input.safeArea.left + 12));
  const right = Math.max(
    left,
    Math.min(input.width, input.width - input.safeArea.right - 12),
  );
  const top = Math.min(input.height, Math.max(0, input.safeArea.top + 11));
  const bottom = Math.max(
    top,
    Math.min(input.height, input.height - input.safeArea.bottom - 11),
  );
  const width = Math.min(48, right - left);
  const height = Math.min(48, bottom - top);
  const targetRight = right;
  const reserved = [hud.topHudBounds, ...hud.weaponSlots.map((slot) => ({
    left: slot.x - slot.width / 2,
    right: slot.x + slot.width / 2,
    top: slot.y - slot.height / 2,
    bottom: slot.y + slot.height / 2,
  })), ...(mobileLayout ? [
    circleBounds(mobileLayout.fireGuard),
    circleBounds(mobileLayout.reloadGuard),
    circleBounds(mobileLayout.shoveGuard),
    circleBounds(mobileLayout.interactionHit),
    circleBounds(mobileLayout.joystick),
  ] : [])];
  const initialTop = Math.min(top + 52, bottom - height);
  const initial = {
    left: targetRight - width,
    right: targetRight,
    top: initialTop,
    bottom: initialTop + height,
  };
  if (reserved.every((area) => !overlaps(initial, area))) return initial;

  const canvasSafeRight = Math.max(
    0,
    Math.min(input.width, input.width - input.safeArea.right),
  );
  const lowestSlotBottom = Math.max(
    ...hud.weaponSlots.map((slot) => slot.y + slot.height / 2),
  );
  const candidates = [
    {
      ...initial,
      top: lowestSlotBottom + 8,
      bottom: lowestSlotBottom + 8 + height,
    },
    {
      left: canvasSafeRight - width,
      right: canvasSafeRight,
      top: bottom - height,
      bottom,
    },
    {
      left: canvasSafeRight - width,
      right: canvasSafeRight,
      top,
      bottom: top + height,
    },
  ];

  const resolved = candidates.find((candidate) => (
    candidate.left >= Math.max(0, input.safeArea.left)
    && candidate.top >= top
    && candidate.bottom <= bottom
    && reserved.every((area) => !overlaps(candidate, area))
  ));
  const supported = isSupportedViewport(input);
  return resolved ?? (supported ? null : initial);
}

function isSupportedViewport(input: GameUiLayoutInput): boolean {
  const usableWidth = input.width
    - Math.max(0, input.safeArea.left)
    - Math.max(0, input.safeArea.right);
  const usableHeight = input.height
    - Math.max(0, input.safeArea.top)
    - Math.max(0, input.safeArea.bottom);
  return usableWidth >= MINIMUM_SUPPORTED_VIEWPORT.width
    && usableHeight >= MINIMUM_SUPPORTED_VIEWPORT.height;
}

export function createGameUiLayout(input: GameUiLayoutInput): GameUiLayout {
  const mobileControlsLayout = input.mobileControls
    ? createMobileControlLayout(input.width, input.height, input.safeArea)
    : null;
  const hud = createHudLayout(
    input.width,
    input.height,
    input.safeArea,
    { reserveMobilePause: input.mobileControls },
  );

  return {
    ...input,
    safeArea: { ...input.safeArea },
    hud,
    pauseButton: pauseBounds(input, hud, mobileControlsLayout),
    mobileControlsLayout,
    supportedViewport: isSupportedViewport(input),
  };
}

export function createLegacyPauseButtonBounds(
  input: Omit<GameUiLayoutInput, 'mobileControls'>,
): UiBounds {
  const layout = { ...input, mobileControls: true };
  return pauseBounds(
    layout,
    createHudLayout(input.width, input.height, input.safeArea),
    null,
  ) ?? { left: 0, right: 0, top: 0, bottom: 0 };
}
