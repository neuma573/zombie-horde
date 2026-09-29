import { translate, type Locale } from '../i18n/catalog';
import type { ExplorationPlanBlock } from '../types/exploration';

/** The warning describes the same schedule conflict that prevented the edit. */
export function explorationPlanMessage(block: ExplorationPlanBlock | null,
  locale: Locale): string {
  if (!block) return '';
  if (block.reason === 'PLAN ACTIVE') return translate(locale, 'Marked for search');
  if (block.reason !== 'NOT ENOUGH TIME') return translate(locale, block.reason);
  return translate(locale, 'Time shortage: {required} h planned / {available} h day', {
    required: block.requiredHours, available: block.availableHours,
  });
}
