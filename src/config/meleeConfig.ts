export interface ShoveConfig {
  staminaMax: number;
  staminaCost: number;
  staminaRecoveryPerSecond: number;
  range: number;
  halfAngleRadians: number;
  pushDistance: number;
  pushDurationMs: number;
}

export const SHOVE_CONFIG = {
  staminaMax: 100,
  staminaCost: 35,
  staminaRecoveryPerSecond: 22,
  range: 72,
  halfAngleRadians: Math.PI / 3,
  pushDistance: 54,
  pushDurationMs: 210,
} as const satisfies ShoveConfig;
