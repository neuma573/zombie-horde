import { describe, expect, it, vi } from 'vitest';

import Phaser from 'phaser';

import { GAME_CONFIG } from '../../gameConfig';
import { GAME_RUNTIME_CONFIG } from '../../config/runtimeConfig';
import { MainMenuScene } from '../../scenes/MainMenuScene';

vi.mock('phaser', () => ({
  default: {
    AUTO: 0,
    Scale: {
      RESIZE: 5,
      Events: { RESIZE: 'resize' },
    },
    Scene: class {},
    Scenes: {
      Events: { SHUTDOWN: 'shutdown' },
    },
  },
}));

describe('game runtime configuration', () => {
  it('uses responsive Phaser scaling without fixed dimensions', () => {
    const input = GAME_CONFIG.input;

    expect(GAME_CONFIG.scale?.mode).toBe(Phaser.Scale.RESIZE);
    expect(GAME_CONFIG.scene).toEqual([MainMenuScene]);
    expect(GAME_CONFIG.scale?.parent).toBe(GAME_RUNTIME_CONFIG.parent);
    expect(input).not.toBe(false);
    expect(input).toBeDefined();
    if (typeof input !== 'object') {
      throw new Error('Expected Phaser input configuration');
    }
    expect(input.activePointers).toBe(
      GAME_RUNTIME_CONFIG.activePointers,
    );
    expect(GAME_RUNTIME_CONFIG.width).toBe('100%');
    expect(GAME_RUNTIME_CONFIG.height).toBe('100%');
    expect(GAME_RUNTIME_CONFIG.activePointers).toBeGreaterThan(0);
    expect(GAME_RUNTIME_CONFIG.width).not.toBe('960');
    expect(GAME_RUNTIME_CONFIG.height).not.toBe('540');
  });
});
