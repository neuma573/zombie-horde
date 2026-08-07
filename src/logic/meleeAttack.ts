import type { Vector2 } from './hitscan';

export interface StaminaState {
  current: number;
}

export interface ShoveTarget {
  id: string;
  position: Vector2;
  radius: number;
}

export interface ShoveConfig {
  staminaMax: number;
  staminaCost: number;
  staminaRecoveryPerSecond: number;
  range: number;
  halfAngleRadians: number;
  pushDistance: number;
}

export interface ShoveResult {
  performed: boolean;
  stamina: StaminaState;
  pushedTargets: Array<{ id: string; desiredPosition: Vector2 }>;
}

export interface ShoveWindupState {
  elapsedMs: number;
}

export function startShoveWindup(
  current: ShoveWindupState | null,
): { started: boolean; state: ShoveWindupState } {
  return current === null
    ? { started: true, state: { elapsedMs: 0 } }
    : { started: false, state: current };
}

export function advanceShoveWindup(
  state: ShoveWindupState,
  deltaMs: number,
  impactDelayMs: number,
): { impacted: boolean; state: ShoveWindupState | null } {
  if (!Number.isFinite(deltaMs) || deltaMs <= 0) {
    return { impacted: false, state };
  }
  const elapsedMs = state.elapsedMs + deltaMs;
  return elapsedMs >= Math.max(0, impactDelayMs)
    ? { impacted: true, state: null }
    : { impacted: false, state: { elapsedMs } };
}

export function resolveShoveTargets(
  origin: Vector2,
  aimDirection: Vector2,
  targets: readonly ShoveTarget[],
  config: Pick<ShoveConfig, 'range' | 'halfAngleRadians' | 'pushDistance'>,
): ShoveResult['pushedTargets'] {
  const aimLength = Math.hypot(aimDirection.x, aimDirection.y);
  const normalizedAim = aimLength > 0
    ? { x: aimDirection.x / aimLength, y: aimDirection.y / aimLength }
    : { x: 1, y: 0 };
  const minimumDot = Math.cos(Math.max(0, config.halfAngleRadians));

  return targets.flatMap((target) => {
    const offset = {
      x: target.position.x - origin.x,
      y: target.position.y - origin.y,
    };
    const distance = Math.hypot(offset.x, offset.y);
    const direction = distance > 0
      ? { x: offset.x / distance, y: offset.y / distance }
      : normalizedAim;
    const inRange = distance <= Math.max(0, config.range) + Math.max(0, target.radius);
    const inArc = direction.x * normalizedAim.x + direction.y * normalizedAim.y >= minimumDot;
    if (!inRange || !inArc) return [];

    return [{
      id: target.id,
      desiredPosition: {
        x: target.position.x + direction.x * Math.max(0, config.pushDistance),
        y: target.position.y + direction.y * Math.max(0, config.pushDistance),
      },
    }];
  });
}

export function createStaminaState(maximum: number): StaminaState {
  return { current: Math.max(0, maximum) };
}

export function recoverStamina(
  state: StaminaState,
  deltaMs: number,
  config: Pick<ShoveConfig, 'staminaMax' | 'staminaRecoveryPerSecond'>,
): StaminaState {
  if (!Number.isFinite(deltaMs) || deltaMs <= 0) return state;

  return {
    current: Math.min(
      Math.max(0, config.staminaMax),
      Math.max(0, state.current) + Math.max(0, config.staminaRecoveryPerSecond) * deltaMs / 1_000,
    ),
  };
}

export function resolveShove(
  stamina: StaminaState,
  origin: Vector2,
  aimDirection: Vector2,
  targets: readonly ShoveTarget[],
  config: ShoveConfig,
): ShoveResult {
  const cost = Math.max(0, config.staminaCost);
  if (stamina.current < cost) {
    return { performed: false, stamina, pushedTargets: [] };
  }

  return {
    performed: true,
    stamina: { current: Math.max(0, stamina.current - cost) },
    pushedTargets: resolveShoveTargets(origin, aimDirection, targets, config),
  };
}
