import { describe, expect, it } from 'vitest';

import { GAME_RUNTIME_CONFIG } from '../../config/runtimeConfig';

describe('game runtime configuration', () => {
  it('uses responsive Phaser scaling without fixed dimensions', () => {
    expect(GAME_RUNTIME_CONFIG.scaleMode).toBe('resize');
    expect(GAME_RUNTIME_CONFIG.width).toBe('100%');
    expect(GAME_RUNTIME_CONFIG.height).toBe('100%');
    expect(GAME_RUNTIME_CONFIG.activePointers).toBeGreaterThan(0);
    expect(GAME_RUNTIME_CONFIG.initialScene).toBe('MainMenuScene');
    expect(GAME_RUNTIME_CONFIG.loadsGameSceneLazily).toBe(true);
    expect(GAME_RUNTIME_CONFIG.width).not.toBe('960');
    expect(GAME_RUNTIME_CONFIG.height).not.toBe('540');
  });
});
