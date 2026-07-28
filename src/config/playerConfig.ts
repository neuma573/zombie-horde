export interface PlayerConfig {
  health: number;
  radius: number;
  speed: number;
  invulnerabilityMs: number;
}

export const PLAYER_CONFIG = {
  health: 100,
  radius: 18,
  speed: 240,
  invulnerabilityMs: 200,
} as const satisfies PlayerConfig;
