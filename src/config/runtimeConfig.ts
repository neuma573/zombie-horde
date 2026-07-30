import { INPUT_CONFIG } from './inputConfig';

export const GAME_RUNTIME_CONFIG = {
  parent: 'game',
  width: '100%',
  height: '100%',
  activePointers: INPUT_CONFIG.activePointers,
} as const;
