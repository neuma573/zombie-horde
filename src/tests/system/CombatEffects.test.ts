import { describe, expect, it } from 'vitest';
import type Phaser from 'phaser';
import { CombatEffects } from '../../effects/CombatEffects';

/** Only the drawing and tween output used by playShot; no Phaser scene simulation. */
function shotOutput() {
  const circles: Array<{ x: number; y: number }> = [];
  const graphics = {
    setDepth() { return this; }, lineStyle() {}, beginPath() {}, moveTo() {}, lineTo() {}, strokePath() {},
  };
  const scene = {
    add: {
      graphics: () => graphics,
      circle(x: number, y: number) {
        const circle = {
          x, y, setDepth() { return this; }, once() {},
          setPosition(nextX: number, nextY: number) { this.x = nextX; this.y = nextY; },
        };
        circles.push(circle);
        return circle;
      },
    },
    tweens: { add() {} },
  };
  return { scene: scene as unknown as Phaser.Scene, circles };
}

describe('shot effect ownership', () => {
  it('moves only the player flashes when the player muzzle moves', () => {
    const { scene, circles } = shotOutput();
    const effects = new CombatEffects(scene);
    effects.playShot({ origin: { x: 10, y: 20 }, endPoint: { x: 0, y: 20 } });
    effects.playShot({ origin: { x: 100, y: 200 }, endPoint: { x: 0, y: 200 }, shooterId: 'ally' });

    effects.updateMuzzlePosition({ x: 30, y: 40 });

    expect(circles.map(({ x, y }) => ({ x, y }))).toEqual([{ x: 30, y: 40 }, { x: 100, y: 200 }]);
  });

  it('keeps other shooters fixed when one companion muzzle moves', () => {
    const { scene, circles } = shotOutput();
    const effects = new CombatEffects(scene);
    effects.playShot({ origin: { x: 10, y: 20 }, endPoint: { x: 0, y: 20 } });
    effects.playShot({ origin: { x: 100, y: 200 }, endPoint: { x: 0, y: 200 }, shooterId: 'ally-a' });
    effects.playShot({ origin: { x: 300, y: 400 }, endPoint: { x: 0, y: 400 }, shooterId: 'ally-b' });

    effects.updateMuzzlePosition({ x: 120, y: 210 }, 'ally-a');

    expect(circles.map(({ x, y }) => ({ x, y }))).toEqual([
      { x: 10, y: 20 }, { x: 120, y: 210 }, { x: 300, y: 400 },
    ]);
  });
});
