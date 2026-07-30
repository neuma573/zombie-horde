import { describe, expect, it } from 'vitest';

import { WAVE_CONFIG } from '../../config/waveConfig';

describe('wave balance', () => {
  it('configures a ten-second rest after each cleared wave', () => {
    expect(WAVE_CONFIG.betweenWaveDelayMs).toBe(10_000);
  });
});
