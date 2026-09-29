import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';

describe('night simulation wiring', () => {
  it('keeps scene simulation time independent of the dawn countdown', async () => {
    // Phaser Scene wiring requires a browser; pure system tests cannot detect
    // a delta discarded by this adapter before it reaches those systems.
    const source = await readFile(new URL('../../scenes/GameScene.ts', import.meta.url), 'utf8');
    const step = source.slice(source.indexOf('  private advanceSimulationStep('),
      source.indexOf('  private advanceCompanions('));
    expect(step).toContain('this.night.advanceTime(deltaMs, this.player.isAlive, this.zombies.length)');
    expect(step).toContain('this.advanceCompanions(deltaMs)');
    expect(step).toContain('this.night.canSpawnZombies()');
    expect(step).not.toContain('getRemainingMs()');
  });
});
