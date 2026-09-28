import { describe, expect, it } from 'vitest';
import { createCompanion } from '../../../logic/companion';
import { explorationPlanMessage } from '../../../logic/explorationFeedback';

const companion = { ...createCompanion('ally', 2, () => 0), firstName: 'Emma', lastName: 'Miller' };

describe('exploration plan feedback', () => {
  it('names the overbooked companion and compares total scheduled hours to the daily limit', () => {
    expect(explorationPlanMessage({ reason: 'NOT ENOUGH TIME', personId: companion.id,
      requiredHours: 13.5, availableHours: 12, waitingHours: 0 }, [companion], 'ko'))
      .toBe('시간 부족 · Emma Miller: 하루 12시간 중 13.5시간 필요');
  });

  it('explains when waiting makes an otherwise affordable plan finish late', () => {
    expect(explorationPlanMessage({ reason: 'NOT ENOUGH TIME', personId: 'player',
      requiredHours: 13, availableHours: 12, waitingHours: 4 }, [], 'en'))
      .toBe('Time shortage · Player: 13 h scheduled / 12 h day\nIncludes 4 h waiting for the search party.');
  });

  it('asks for a searcher instead of inventing a time shortage for an empty team', () => {
    expect(explorationPlanMessage({ reason: 'NO SEARCHERS' }, [], 'ko')).toBe('탐색 참여자를 1명 이상 선택하세요.');
  });

  it('shows no warning for a valid plan', () => {
    expect(explorationPlanMessage(null, [companion], 'ko')).toBe('');
  });
});
