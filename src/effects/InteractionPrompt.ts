import Phaser from 'phaser';
import { positionTooltip, type SafeAreaInsets } from '../logic/hud';

export class InteractionPrompt {
  private readonly label: Phaser.GameObjects.Text;

  constructor(scene: Phaser.Scene) {
    this.label = scene.add.text(0, 0, '', {
      fontFamily: 'sans-serif', fontSize: '14px', fontStyle: 'bold',
      color: '#fff0b3', backgroundColor: '#101820',
      padding: { x: 10, y: 7 }, align: 'center',
    }).setOrigin(0.5).setScrollFactor(0).setDepth(190).setVisible(false);
  }

  update(
    message: string | null,
    playerScreen: { x: number; y: number },
    viewport: { width: number; height: number },
    safeArea: SafeAreaInsets,
  ): void {
    this.label.setVisible(message !== null);
    if (message === null) return;
    this.label.setWordWrapWidth(Math.max(1,
      Math.min(280, viewport.width - safeArea.left - safeArea.right - 44),
    )).setText(message);
    const position = positionTooltip(
      { x: playerScreen.x, y: playerScreen.y - 32 },
      this.label, viewport, 'above', safeArea,
    );
    this.label.setPosition(position.x, position.y);
  }

  hide(): void { this.label.setVisible(false); }
  destroy(): void { this.label.destroy(); }
}
