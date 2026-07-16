import Phaser from 'phaser';

import { INPUT_CONFIG } from './config/inputConfig';
import { GameScene } from './scenes/GameScene';

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  backgroundColor: '#1b1b1b',
  input: {
    activePointers: INPUT_CONFIG.activePointers,
  },
  scale: {
    mode: Phaser.Scale.RESIZE,
    parent: 'game',
    width: '100%',
    height: '100%',
  },
  scene: [GameScene],
};

new Phaser.Game(config);
