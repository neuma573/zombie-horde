import { readFile } from 'node:fs/promises';

import { describe, expect, it } from 'vitest';

describe('melee input timeline wiring', () => {
  it('queues pointer fire until the current fixed steps have been consumed', async () => {
    const gameScenePath = new URL('../../scenes/GameScene.ts', import.meta.url);
    const gameScene = await readFile(gameScenePath, 'utf8');
    const updateStart = gameScene.indexOf('  update(time: number, deltaMs: number): void {');
    const updateEnd = gameScene.indexOf('  private advanceSimulationStep(', updateStart);
    const update = gameScene.slice(updateStart, updateEnd);
    const fixedStepLoop = update.indexOf('for (let step = 0; step < fixedSteps.stepCount; step += 1)');
    const simulationAdvance = update.indexOf(
      'this.simulationElapsedMs += SIMULATION_CONFIG.fixedStepMs;',
    );
    const fireResolution = update.indexOf(
      'this.resolveFireRequests(',
      simulationAdvance,
    );
    const pointerDownStart = gameScene.indexOf('  private handlePointerDown(');
    const pointerDownEnd = gameScene.indexOf('  private handlePointerMove(', pointerDownStart);
    const pointerDown = gameScene.slice(pointerDownStart, pointerDownEnd);

    // Phaser owns the pointer callbacks, so this contract verifies the Scene
    // adapter boundary without recreating its browser event loop in a unit test.
    expect(pointerDown).toContain('this.fireRequestSimulationTime(pointer)');
    expect(pointerDown).not.toContain('this.resolveFireRequests();');
    expect(fixedStepLoop).toBeGreaterThanOrEqual(0);
    expect(simulationAdvance).toBeGreaterThan(fixedStepLoop);
    expect(fireResolution).toBeGreaterThan(simulationAdvance);
  });
});
