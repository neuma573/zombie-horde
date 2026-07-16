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
  private current?: HudViewModel;

  constructor(scene: Phaser.Scene) {
    this.playerText = scene.add.text(0, 0, '', STATUS_STYLE).setDepth(100).setScrollFactor(0);
    this.waveText = scene.add.text(0, 0, '', STATUS_STYLE).setDepth(100).setScrollFactor(0);
    this.gameOverText = scene.add.text(0, 0, '', {
      ...STATUS_STYLE,
      align: 'center',
      fontSize: '24px',
    }).setDepth(100).setOrigin(0.5).setScrollFactor(0).setVisible(false);
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
  }

  destroy(): void {
    this.playerText.destroy();
    this.waveText.destroy();
    this.gameOverText.destroy();
  }
}
