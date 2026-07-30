import { describe, expect, it } from 'vitest';

import { PLAYER_CONFIG } from '../../config/playerConfig';

describe('player balance', () => {
  it('uses a short 200ms invulnerability window', () => {
    expect(PLAYER_CONFIG.invulnerabilityMs).toBe(200);
  });
});
