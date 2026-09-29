import { describe, expect, it } from 'vitest';
import { explorationPlanMessage } from '../../../logic/explorationFeedback';

describe('exploration plan feedback', () => {
  it('compares shared planned hours with the daily limit in Korean', () => {
    expect(explorationPlanMessage({ reason: 'NOT ENOUGH TIME',
      requiredHours: 13.5, availableHours: 12 }, 'ko'))
      .toBe('시간 부족: 하루 12시간 중 13.5시간 필요');
  });

  it('compares shared planned hours with the daily limit in English', () => {
    expect(explorationPlanMessage({ reason: 'NOT ENOUGH TIME',
      requiredHours: 13, availableHours: 12 }, 'en'))
      .toBe('Time shortage: 13 h planned / 12 h day');
  });

  it('shows the existing building selection instead of a time shortage', () => {
    expect(explorationPlanMessage({ reason: 'PLAN ACTIVE' }, 'ko')).toBe('수색 예정');
  });

  it('shows no warning for a valid plan', () => {
    expect(explorationPlanMessage(null, 'ko')).toBe('');
  });
});
