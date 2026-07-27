import { describe, expect, it } from 'vitest';

import { WORLD_RENDER_DEPTH } from '../config/renderDepth';

describe('world render depth', () => {
  it('keeps zombie remains below the player', () => {
    expect(WORLD_RENDER_DEPTH.bloodPool).toBeLessThan(
      WORLD_RENDER_DEPTH.zombieCorpse,
    );
    expect(WORLD_RENDER_DEPTH.zombieCorpse).toBeLessThan(
      WORLD_RENDER_DEPTH.player,
    );
  });

  it('keeps transient combat effects above the player', () => {
    expect(WORLD_RENDER_DEPTH.combatEffect).toBeGreaterThan(
      WORLD_RENDER_DEPTH.player,
    );
  });
});
