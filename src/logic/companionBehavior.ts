import type { Vector2 } from './hitscan';

/** Deterministic decisions, sampled on state changes rather than on rendered frames. */
export function companionDecision(seed: number, sequence: number): number {
  let value = Math.imul(seed, 0x9e3779b9) ^ Math.imul(sequence + 1, 0x85ebca6b);
  value = Math.imul(value ^ (value >>> 16), 0x21f0aaad);
  value = Math.imul(value ^ (value >>> 15), 0x735a2d97);
  return ((value ^ (value >>> 15)) >>> 0) / 0x1_0000_0000;
}

export function turnCompanionAim(current: Vector2, desired: Vector2, maxRadians: number): Vector2 {
  if (Math.hypot(desired.x, desired.y) < 1e-8) return { ...current };
  const angle = Math.atan2(current.y, current.x);
  const difference = Math.atan2(Math.sin(Math.atan2(desired.y, desired.x) - angle),
    Math.cos(Math.atan2(desired.y, desired.x) - angle));
  const next = angle + Math.max(-maxRadians, Math.min(maxRadians, difference));
  return { x: Math.cos(next), y: Math.sin(next) };
}
