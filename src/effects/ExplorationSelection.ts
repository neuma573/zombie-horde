import Phaser from 'phaser';

const DRAW_DURATION = 340;

/** Draws a slightly uneven, overlapping pen stroke; never changes the search plan. */
export function drawExplorationSelection(
  scene: Phaser.Scene, parent: Phaser.GameObjects.Container,
  x: number, y: number, width: number, height: number, startedAt?: number,
): void {
  const ink = scene.add.graphics();
  parent.add(ink);
  const elapsed = startedAt === undefined ? DRAW_DURATION : scene.time.now - startedAt;
  const progress = { value: Phaser.Math.Clamp(elapsed / DRAW_DURATION, 0, 1) };
  const point = (t: number) => {
    const angle = -Math.PI * 0.7 + t * Math.PI * 2.18;
    const wobble = 1 + 0.025 * Math.sin(angle * 3) + 0.018 * Math.cos(angle * 5);
    return { x: x + Math.cos(angle) * width / 2 * wobble + t * 2,
      y: y + Math.sin(angle) * height / 2 * wobble - t * 2 };
  };
  const draw = () => {
    ink.clear();
    const steps = 100;
    for (let i = 0; i < Math.ceil(progress.value * steps); i++) {
      const from = point(i / steps);
      const to = point(Math.min((i + 1) / steps, progress.value));
      ink.lineStyle(2.2 + 0.45 * Math.sin(i * 0.13), 0x982c24, 0.9);
      ink.lineBetween(from.x, from.y, to.x, to.y);
    }
    if (progress.value > 0 && progress.value < 1) {
      const tip = point(progress.value);
      ink.fillStyle(0x742019, 0.95).fillCircle(tip.x, tip.y, 1.8);
    }
  };
  draw();
  if (progress.value < 1) {
    const tween = scene.tweens.add({ targets: progress, value: 1,
      duration: DRAW_DURATION - Math.max(0, elapsed), ease: 'Linear', onUpdate: draw });
    ink.once('destroy', () => tween.remove());
  }
}
