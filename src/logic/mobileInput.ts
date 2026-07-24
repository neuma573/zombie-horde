import { INPUT_CONFIG } from '../config/inputConfig';
import type { SafeAreaInsets } from './hud';
import type { MovementInput, Position } from './movement';

export type MobilePointerRole = 'movement' | 'aim' | 'fire' | 'reload';
export type MobilePointerClassification = MobilePointerRole | 'controlGuard' | null;
export type ViewportOrientation = 'portrait' | 'landscape';

export interface CircleControl {
  x: number;
  y: number;
  radius: number;
}

export interface RectangleControl {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface MobileControlLayout {
  joystick: CircleControl;
  fire: CircleControl;
  fireHit: CircleControl;
  fireGuard: CircleControl;
  reload: CircleControl;
  reloadHit: CircleControl;
  reloadGuard: CircleControl;
  controlExclusion: RectangleControl;
  aimTop: number;
  knobRadius: number;
}

export interface MobilePointerOwnership {
  movement: number | null;
  aim: number | null;
  fire: number | null;
  reload: number | null;
}

export function createMobilePointerOwnership(): MobilePointerOwnership {
  return { movement: null, aim: null, fire: null, reload: null };
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
  const fireHitRadius = fireRadius + INPUT_CONFIG.fireHitSlop * scale;
  const fireGuardRadius = fireHitRadius + INPUT_CONFIG.fireGuardSlop * scale;
  const reloadRadius = INPUT_CONFIG.reloadButtonRadius * scale;
  const reloadHitRadius = reloadRadius + INPUT_CONFIG.reloadHitSlop * scale;
  const reloadGuardRadius = reloadHitRadius + INPUT_CONFIG.reloadGuardSlop * scale;
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
      fire.y - fireHitRadius - reloadHitRadius - gap,
      reloadRadius,
      Math.max(reloadRadius, height - reloadRadius),
    ),
    radius: reloadRadius,
  };
  const exclusionLeft = Math.max(
    0,
    Math.min(fire.x - fireGuardRadius, reload.x - reloadGuardRadius),
  );
  const exclusionTop = Math.max(
    0,
    Math.min(fire.y - fireGuardRadius, reload.y - reloadGuardRadius),
  );
  const exclusionRight = Math.min(width, right);
  const exclusionBottom = Math.min(height, bottom);
  return {
    joystick,
    fire,
    fireHit: { ...fire, radius: fireHitRadius },
    fireGuard: { ...fire, radius: fireGuardRadius },
    reload,
    reloadHit: { ...reload, radius: reloadHitRadius },
    reloadGuard: { ...reload, radius: reloadGuardRadius },
    controlExclusion: {
      x: exclusionLeft,
      y: exclusionTop,
      width: Math.max(0, exclusionRight - exclusionLeft),
      height: Math.max(0, exclusionBottom - exclusionTop),
    },
    aimTop: Math.min(height, Math.max(0, safeArea.top)),
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

function containsRectangle(rectangle: RectangleControl, point: Position): boolean {
  return point.x >= rectangle.x
    && point.x <= rectangle.x + rectangle.width
    && point.y >= rectangle.y
    && point.y <= rectangle.y + rectangle.height;
}

export function classifyMobilePointer(
  point: Position,
  layout: MobileControlLayout,
): MobilePointerClassification {
  if (contains(layout.fireHit, point)) return 'fire';
  if (contains(layout.reloadHit, point)) return 'reload';
  if (contains(layout.joystick, point)) return 'movement';
  if (
    contains(layout.fireGuard, point)
    || contains(layout.reloadGuard, point)
    || containsRectangle(layout.controlExclusion, point)
  ) {
    return 'controlGuard';
  }
  return point.y >= layout.aimTop ? 'aim' : null;
}

export function lateClaimMobilePointerRole(
  role: MobilePointerClassification,
): 'aim' | null {
  return role === 'aim' ? role : null;
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
