import { INPUT_CONFIG } from '../config/inputConfig';
import type { SafeAreaInsets } from './hud';
import type { MovementInput, Position } from './movement';

export type MobilePointerRole = 'movement' | 'aim' | 'fire' | 'reload' | 'fog';
export type ViewportOrientation = 'portrait' | 'landscape';

export interface CircleControl {
  x: number;
  y: number;
  radius: number;
}

export interface MobileControlLayout {
  joystick: CircleControl;
  fire: CircleControl;
  reload: CircleControl;
  fog: CircleControl;
  aimTop: number;
  knobRadius: number;
}

export interface MobilePointerOwnership {
  movement: number | null;
  aim: number | null;
  fire: number | null;
  reload: number | null;
  fog: number | null;
}

export function createMobilePointerOwnership(): MobilePointerOwnership {
  return { movement: null, aim: null, fire: null, reload: null, fog: null };
}

export function shouldShowMobileControls(
  maxTouchPoints: number,
  coarsePointer: boolean,
): boolean {
  return maxTouchPoints > 0 && coarsePointer;
}

export function getViewportOrientation(width: number, height: number): ViewportOrientation {
  return width >= height ? 'landscape' : 'portrait';
}

export function didViewportOrientationChange(
  previous: ViewportOrientation | undefined,
  width: number,
  height: number,
): boolean {
  return previous !== undefined && previous !== getViewportOrientation(width, height);
}

export function canRestartWithMobileTouch(
  mobileControlsEnabled: boolean,
  restartArmed: boolean,
): boolean {
  return mobileControlsEnabled && restartArmed;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export function createMobileControlLayout(
  width: number,
  height: number,
  safeArea: SafeAreaInsets,
): MobileControlLayout {
  const safeWidth = Math.max(0, width - Math.max(0, safeArea.left) - Math.max(0, safeArea.right));
  const safeHeight = Math.max(0, height - Math.max(0, safeArea.top) - Math.max(0, safeArea.bottom));
  const shortEdge = Math.min(safeWidth, safeHeight);
  const scale = clamp(
    shortEdge / INPUT_CONFIG.referenceShortEdge,
    INPUT_CONFIG.minimumScale,
    1,
  );
  const joystickRadius = INPUT_CONFIG.joystickRadius * scale;
  const fireRadius = INPUT_CONFIG.fireButtonRadius * scale;
  const reloadRadius = INPUT_CONFIG.reloadButtonRadius * scale;
  const fogRadius = INPUT_CONFIG.fogButtonRadius * scale;
  const margin = INPUT_CONFIG.edgeMargin * scale;
  const gap = INPUT_CONFIG.controlGap * scale;
  const left = Math.max(0, safeArea.left);
  const right = width - Math.max(0, safeArea.right);
  const bottom = height - Math.max(0, safeArea.bottom);
  const joystick = {
    x: clamp(left + margin + joystickRadius, joystickRadius, Math.max(joystickRadius, width - joystickRadius)),
    y: clamp(bottom - margin - joystickRadius, joystickRadius, Math.max(joystickRadius, height - joystickRadius)),
    radius: joystickRadius,
  };
  const fire = {
    x: clamp(right - margin - fireRadius, fireRadius, Math.max(fireRadius, width - fireRadius)),
    y: clamp(bottom - margin - fireRadius, fireRadius, Math.max(fireRadius, height - fireRadius)),
    radius: fireRadius,
  };
  const reload = {
    x: fire.x,
    y: clamp(
      fire.y - fireRadius - reloadRadius - gap,
      reloadRadius,
      Math.max(reloadRadius, height - reloadRadius),
    ),
    radius: reloadRadius,
  };
  const fog = {
    x: clamp(
      reload.x - reloadRadius - fogRadius - gap,
      fogRadius,
      Math.max(fogRadius, width - fogRadius),
    ),
    y: reload.y,
    radius: fogRadius,
  };
  const hudHeight = width < INPUT_CONFIG.wideLayoutMinWidth
    ? INPUT_CONFIG.portraitHudExclusionHeight
    : INPUT_CONFIG.landscapeHudExclusionHeight;

  return {
    joystick,
    fire,
    reload,
    fog,
    aimTop: Math.min(height, Math.max(0, safeArea.top) + hudHeight * scale),
    knobRadius: INPUT_CONFIG.joystickKnobRadius * scale,
  };
}

export function joystickMovement(
  pointer: Position,
  joystick: CircleControl,
  deadzone: number = INPUT_CONFIG.joystickDeadzone,
): MovementInput {
  const offsetX = pointer.x - joystick.x;
  const offsetY = pointer.y - joystick.y;
  const distance = Math.hypot(offsetX, offsetY);
  const normalizedDeadzone = clamp(deadzone, 0, 0.99);
  const deadzoneRadius = joystick.radius * normalizedDeadzone;

  if (distance <= deadzoneRadius || joystick.radius <= 0) {
    return { x: 0, y: 0 };
  }

  const magnitude = clamp(
    (Math.min(distance, joystick.radius) - deadzoneRadius)
      / (joystick.radius - deadzoneRadius),
    0,
    1,
  );

  return {
    x: offsetX / distance * magnitude,
    y: offsetY / distance * magnitude,
  };
}

export function joystickKnobPosition(
  pointer: Position | null,
  joystick: CircleControl,
): Position {
  if (!pointer) {
    return { x: joystick.x, y: joystick.y };
  }

  const offsetX = pointer.x - joystick.x;
  const offsetY = pointer.y - joystick.y;
  const distance = Math.hypot(offsetX, offsetY);

  if (distance === 0 || distance <= joystick.radius) {
    return { ...pointer };
  }

  return {
    x: joystick.x + offsetX / distance * joystick.radius,
    y: joystick.y + offsetY / distance * joystick.radius,
  };
}

function contains(circle: CircleControl, point: Position): boolean {
  return Math.hypot(point.x - circle.x, point.y - circle.y) <= circle.radius;
}

export function classifyMobilePointer(
  point: Position,
  layout: MobileControlLayout,
): MobilePointerRole | null {
  if (contains(layout.fire, point)) return 'fire';
  if (contains(layout.reload, point)) return 'reload';
  if (contains(layout.fog, point)) return 'fog';
  if (contains(layout.joystick, point)) return 'movement';
  return point.y >= layout.aimTop ? 'aim' : null;
}

export function claimMobilePointer(
  ownership: MobilePointerOwnership,
  pointerId: number,
  role: MobilePointerRole | null,
): MobilePointerOwnership {
  if (role === null || Object.values(ownership).includes(pointerId) || ownership[role] !== null) {
    return ownership;
  }

  return { ...ownership, [role]: pointerId };
}

export function roleForPointer(
  ownership: MobilePointerOwnership,
  pointerId: number,
): MobilePointerRole | null {
  return (Object.keys(ownership) as MobilePointerRole[])
    .find((role) => ownership[role] === pointerId) ?? null;
}

export function releaseMobilePointer(
  ownership: MobilePointerOwnership,
  pointerId: number,
): MobilePointerOwnership {
  const role = roleForPointer(ownership, pointerId);
  return role ? { ...ownership, [role]: null } : ownership;
}
