import { MELEE_MOTION } from '../config/meleeMotionConfig';

export function advanceMeleeSwing(
  elapsedMs: number | null,
  deltaMs: number,
): { elapsedMs: number | null; impactOffsetMs: number | null } {
  if (elapsedMs === null || !Number.isFinite(deltaMs) || deltaMs <= 0) {
    return { elapsedMs, impactOffsetMs: null };
  }
  const contact = MELEE_MOTION.durationMs * MELEE_MOTION.impactProgress;
  const next = elapsedMs + deltaMs;
  return {
    elapsedMs: next >= MELEE_MOTION.durationMs ? null : next,
    impactOffsetMs: elapsedMs < contact && next >= contact ? contact - elapsedMs : null,
  };
}
