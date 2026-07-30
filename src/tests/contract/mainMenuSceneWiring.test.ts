import { readFile } from 'node:fs/promises';

import { describe, expect, it } from 'vitest';

describe('MainMenuScene wiring', () => {
  it('connects lazy loading, responsive resize, and class selection', async () => {
    const menuScenePath = new URL('../../scenes/MainMenuScene.ts', import.meta.url);
    const menuScene = await readFile(menuScenePath, 'utf8');

    // Phaser Scene wiring cannot run in the Node test environment without
    // recreating the browser and Phaser runtime. TESTING.md permits a source
    // contract when a structured value cannot be imported or executed.
    expect(menuScene).toContain("await import('./GameScene')");
    expect(menuScene).not.toMatch(/preload\(\): void[\s\S]*this\.load\.image/);
    expect(menuScene).toContain('new ResizeObserver');
    expect(menuScene).toContain("window.visualViewport?.addEventListener(\n      'resize'");
    expect(menuScene).toContain('this.scale.resize(width, height)');
    expect(menuScene).toContain('this.selectedClassId !== requestedClassId');
    expect(menuScene).toContain(
      'this.registry.set(GAME_REGISTRY_KEYS.characterClassId, requestedClassId)',
    );
  });
});
