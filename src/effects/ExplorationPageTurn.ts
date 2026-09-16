import Phaser from 'phaser';

/** A paper sheet folds toward its binding to reveal the confirmed day results. */
export function turnExplorationPage(scene: Phaser.Scene, parent: Phaser.GameObjects.Container,
  box: { x: number; y: number; width: number; height: number }): void {
  const sheet = scene.add.graphics();
  parent.add(sheet);
  const progress = { value: 0 };
  const draw = () => {
    const edge = box.x + box.width * (1 - progress.value);
    const fold = Math.sin(progress.value * Math.PI) * Math.min(48, box.width * 0.2);
    sheet.clear();
    sheet.fillStyle(0xe4dca8).fillRect(box.x, box.y, edge - box.x, box.height);
    sheet.fillStyle(0x323429, 0.18).fillRect(edge, box.y + 3, fold * 0.4, box.height);
    sheet.fillStyle(0xf4ecc8).fillTriangle(edge - fold, box.y + fold * 0.25,
      edge, box.y, edge, box.y + box.height);
    sheet.lineStyle(1, 0x9d946c, 0.6).lineBetween(edge, box.y, edge, box.y + box.height);
  };
  draw();
  const tween = scene.tweens.add({ targets: progress, value: 1, duration: 420,
    ease: 'Sine.InOut', onUpdate: draw, onComplete: () => sheet.destroy() });
  sheet.once('destroy', () => tween.remove());
}
