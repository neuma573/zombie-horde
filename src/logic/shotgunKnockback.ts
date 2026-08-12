export interface ShotgunKnockbackConfig {
  distancePerPellet: number;
  maximumDistance: number;
  durationMs: number;
}

export function shotgunKnockbackDistance(
  pelletHits: number,
  config: ShotgunKnockbackConfig,
): number {
  if (!Number.isFinite(pelletHits) || pelletHits <= 0) return 0;
  return Math.min(
    Math.max(0, config.maximumDistance),
    Math.floor(pelletHits) * Math.max(0, config.distancePerPellet),
  );
}
