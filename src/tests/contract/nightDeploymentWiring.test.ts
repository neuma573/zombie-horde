import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';

describe('night deployment wiring', () => {
  it('clears deployment only after accepting victory while preserving defeat and retry selections', async () => {
    // The Phaser wake callback cannot be exercised by pure system tests.
    const source = await readFile(new URL('../../scenes/ExplorationScene.ts', import.meta.url), 'utf8');
    const success = source.slice(source.indexOf('if (victory && this.exploration.completeNight('),
      source.indexOf('} else this.exploration.retryNight();'));
    expect(success).toContain('this.armory.clearDeployments()');
    expect(source.match(/this\.armory\.clearDeployments\(\)/g)).toHaveLength(1);
    expect(source).toContain('} else this.exploration.retryNight();');
  });
});
