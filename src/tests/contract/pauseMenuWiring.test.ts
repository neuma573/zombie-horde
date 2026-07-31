import { readFile } from 'node:fs/promises';

import { describe, expect, it } from 'vitest';

describe('pause menu wiring', () => {
  it('connects desktop and mobile pause entry to frozen gameplay', async () => {
    const gameScenePath = new URL('../../scenes/GameScene.ts', import.meta.url);
    const gameScene = await readFile(gameScenePath, 'utf8');

    // Phaser input and Scene rendering require the browser runtime, so this
    // contract keeps the adapter wiring visible without recreating Phaser.
    expect(gameScene).toContain('Phaser.Input.Keyboard.KeyCodes.ESC');
    expect(gameScene).toContain('this.pauseMenu?.blocksGameplayPointer(pointer.x, pointer.y)');
    expect(gameScene).toContain('if (this.pauseMenu?.isOpen()) return;');
    expect(gameScene).toContain('this.mobileControlsEnabled && isPlaying(this.sessionState)');
    expect(gameScene).toContain('this.pauseMenu?.setMobileVisible(false);');
    expect(gameScene).toMatch(
      /private readonly handleWheelZoom = \([\s\S]*?if \(this\.pauseMenu\?\.isOpen\(\)\) return;/,
    );
    expect(gameScene).toContain('this.time.paused = true;');
    expect(gameScene).toContain('this.tweens.pauseAll();');
    expect(gameScene).toContain('this.time.paused = false;');
    expect(gameScene).toContain('this.tweens.resumeAll();');
  });

  it('shares settings and exposes resume and main-menu actions', async () => {
    const pauseMenuPath = new URL('../../systems/PauseMenu.ts', import.meta.url);
    const pauseMenu = await readFile(pauseMenuPath, 'utf8');

    expect(pauseMenu).toContain("'RESUME'");
    expect(pauseMenu).toContain("'SETTINGS'");
    expect(pauseMenu).toContain("'MAIN MENU'");
    expect(pauseMenu).toContain('GAME_REGISTRY_KEYS.soundEnabled');
    expect(pauseMenu).toContain('syncSoundEnabled(this.scene.sound, next.soundEnabled)');
    expect(pauseMenu).toContain('this.onPause();');
    expect(pauseMenu).toContain('this.onResume();');
  });
});
