import { INPUT_CONFIG } from './inputConfig';

export const GAME_RUNTIME_CONFIG = {
  parent: 'game',
  width: '100%',
  height: '100%',
  scaleMode: 'resize',
  activePointers: INPUT_CONFIG.activePointers,
  initialScene: 'MainMenuScene',
  loadsGameSceneLazily: true,
} as const;
