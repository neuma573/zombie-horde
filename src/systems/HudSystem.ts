import Phaser from 'phaser';

import {
  createHudLayout,
  type HudViewModel,
  type SafeAreaInsets,
} from '../logic/hud';

const STATUS_STYLE: Phaser.Types.GameObjects.Text.TextStyle = {
  color: '#ffffff',
  fontFamily: 'sans-serif',
  fontSize: '16px',
  lineSpacing: 3,
  stroke: '#000000',
  strokeThickness: 3,
};

export class HudSystem {
  private readonly playerText: Phaser.GameObjects.Text;
  private readonly waveText: Phaser.GameObjects.Text;
  private readonly gameOverText: Phaser.GameObjects.Text;
  private readonly reloadGraphics: Phaser.GameObjects.Graphics;
  private readonly reloadText: Phaser.GameObjects.Text;
  private current?: HudViewModel;
  private reloadLayout?: ReturnType<typeof createHudLayout>['reload'];

  constructor(scene: Phaser.Scene) {
    this.playerText = scene.add.text(0, 0, '', STATUS_STYLE).setDepth(100).setScrollFactor(0);
    this.waveText = scene.add.text(0, 0, '', STATUS_STYLE).setDepth(100).setScrollFactor(0);
    this.gameOverText = scene.add.text(0, 0, '', {
      ...STATUS_STYLE,
      align: 'center',
      fontSize: '24px',
    }).setDepth(100).setOrigin(0.5).setScrollFactor(0).setVisible(false);
    this.reloadGraphics = scene.add.graphics().setDepth(110).setScrollFactor(0).setVisible(false);
    this.reloadText = scene.add.text(0, 0, 'RELOADING', {
      color: '#e8e8e8',
      fontFamily: 'sans-serif',
      fontSize: '12px',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 2,
    }).setDepth(111).setOrigin(0.5, 1).setScrollFactor(0).setVisible(false);
  }

  update(viewModel: HudViewModel): void {
    if (this.current?.playerText !== viewModel.playerText) {
      this.playerText.setText(viewModel.playerText);
    }
    if (this.current?.waveText !== viewModel.waveText) {
      this.waveText.setText(viewModel.waveText);
    }
    if (this.current?.gameOverText !== viewModel.gameOverText) {
      this.gameOverText.setText(viewModel.gameOverText);
    }
    if (this.current?.showGameOver !== viewModel.showGameOver) {
      this.gameOverText.setVisible(viewModel.showGameOver);
    }

    this.drawReloadFeedback(viewModel.reloadProgress, viewModel.reloadPrompt);

    this.current = viewModel;
  }

  resize(width: number, height: number, safeArea: SafeAreaInsets): void {
    const layout = createHudLayout(width, height, safeArea);

    this.playerText.setOrigin(0, 0).setPosition(layout.player.x, layout.player.y);
    this.waveText
      .setOrigin(layout.wave.alignRight ? 1 : 0, 0)
      .setAlign(layout.wave.alignRight ? 'right' : 'left')
      .setPosition(layout.wave.x, layout.wave.y);
    this.gameOverText.setPosition(layout.gameOver.x, layout.gameOver.y);
    this.reloadLayout = layout.reload;
    this.reloadText.setPosition(layout.reload.x + layout.reload.width / 2, layout.reload.y - 5);
    this.drawReloadFeedback(
      this.current?.reloadProgress ?? null,
      this.current?.reloadPrompt ?? null,
    );
  }

  destroy(): void {
    this.playerText.destroy();
    this.waveText.destroy();
    this.gameOverText.destroy();
    this.reloadGraphics.destroy();
    this.reloadText.destroy();
  }

  private drawReloadFeedback(progress: number | null, prompt: string | null): void {
    this.reloadGraphics.clear();

    if (!this.reloadLayout || (progress === null && prompt === null)) {
      this.reloadGraphics.setVisible(false);
      this.reloadText.setVisible(false);
      return;
    }

    const { x, y, width, height } = this.reloadLayout;

    if (progress === null) {
      this.reloadGraphics.setVisible(false);
      this.reloadText.setText(prompt ?? '').setVisible(true);
      return;
    }

    const normalized = Math.min(1, Math.max(0, progress));
    this.reloadText.setText('RELOADING');
    this.reloadGraphics
      .fillStyle(0x111111, 0.78)
      .fillRect(x, y, width, height)
      .fillStyle(0xd8d8d8, 0.95)
      .fillRect(x + 2, y + 2, Math.max(0, (width - 4) * normalized), Math.max(0, height - 4))
      .lineStyle(1, 0xffffff, 0.7)
      .strokeRect(x, y, width, height)
      .setVisible(true);
    this.reloadText.setVisible(true);
  }
}
