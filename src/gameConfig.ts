import Phaser from 'phaser';

import { GAME_RUNTIME_CONFIG } from './config/runtimeConfig';
import { MainMenuScene } from './scenes/MainMenuScene';

export const GAME_CONFIG: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  backgroundColor: '#1b1b1b',
  input: {
    activePointers: GAME_RUNTIME_CONFIG.activePointers,
  },
  scale: {
    mode: Phaser.Scale.RESIZE,
    parent: GAME_RUNTIME_CONFIG.parent,
    width: GAME_RUNTIME_CONFIG.width,
    height: GAME_RUNTIME_CONFIG.height,
  },
  scene: [MainMenuScene],
};
