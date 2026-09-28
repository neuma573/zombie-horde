import { translate, type Locale } from '../i18n/catalog';
import type { Companion } from '../types/companion';
import type { ExplorationPlanBlock } from '../types/exploration';

/** The warning describes the same schedule conflict that prevented the edit. */
export function explorationPlanMessage(block: ExplorationPlanBlock | null,
  companions: readonly Companion[], locale: Locale): string {
  if (!block) return '';
  if (block.reason === 'NO SEARCHERS') return translate(locale, 'Select at least one searcher.');
  if (block.reason === 'INVALID SEARCHERS') return translate(locale, 'This searcher is unavailable.');
  if (block.reason === 'PLAN ACTIVE') return translate(locale, 'Marked for search');
  if (block.reason !== 'NOT ENOUGH TIME') return translate(locale, block.reason);
  const ally = companions.find(ally => ally.id === block.personId);
  const name = ally ? `${ally.firstName} ${ally.lastName}` : translate(locale, 'Player');
  const message = translate(locale, 'Time shortage · {name}: {required} h scheduled / {available} h day', {
    name, required: block.requiredHours, available: block.availableHours,
  });
  return message + (block.waitingHours > 0
    ? '\n' + translate(locale, 'Includes {hours} h waiting for the search party.', { hours: block.waitingHours }) : '');
}
