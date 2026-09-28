import { COMPANION_CONFIG } from '../config/companionConfig';

/** Keep the survivor visible in the room; fade only on the final approach to the exit. */
export function getCompanionVisualAlpha(
  state: 'active' | 'fleeing' | 'left',
  distanceToExit: number,
): number {
  if (state === 'active') return 1;
  if (state === 'left') return 0;
  return Math.max(0, Math.min(1, distanceToExit / COMPANION_CONFIG.fleeFadeDistance));
}
