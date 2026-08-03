import Phaser from 'phaser';

import { GAME_REGISTRY_KEYS } from '../config/menuConfig';
import { syncSoundEnabled } from '../effects/audioSettings';
import { toggleSound } from '../logic/menu';
import {
  clampPauseActionWidth,
  createPauseMenuActionLayout,
  fitPauseTextFontSize,
  isPointInBounds,
  pauseButtonBounds,
} from '../logic/pauseMenu';
import type { UiBounds } from '../logic/gameUiLayout';

type PauseMenuView = 'main' | 'settings';

const COLORS = {
  backdrop: 0x071018,
  panel: 0x1b252e,
  border: 0x6f8798,
  accent: 0xd7b45a,
  text: '#eef4f7',
  muted: '#9aabb5',
  icon: 0xeef4f7,
} as const;

export interface PauseMenuLayout {
  width: number;
  height: number;
  safeArea: { top: number; right: number; bottom: number; left: number };
}

export class PauseMenu {
  private readonly scene: Phaser.Scene;
  private readonly onPause: () => void;
  private readonly onResume: () => void;
  private readonly onMainMenu: () => void;
  private readonly pauseButton: Phaser.GameObjects.Container;
  private readonly overlay: Phaser.GameObjects.Container;
  private layout: PauseMenuLayout;
  private view: PauseMenuView = 'main';
  private open = false;
  private mobileVisible = false;
  private resolvedPauseBounds?: UiBounds | null;

  constructor(
    scene: Phaser.Scene,
    layout: PauseMenuLayout,
    onPause: () => void,
    onResume: () => void,
    onMainMenu: () => void,
  ) {
    this.scene = scene;
    this.layout = layout;
    this.onPause = onPause;
    this.onResume = onResume;
    this.onMainMenu = onMainMenu;
    this.pauseButton = scene.add.container(0, 0).setDepth(950).setScrollFactor(0);
    this.overlay = scene.add.container(0, 0).setDepth(1_000).setScrollFactor(0);
    this.overlay.setVisible(false);
    this.renderPauseButton();
  }

  isOpen(): boolean {
    return this.open;
  }

  blocksGameplayPointer(x: number, y: number): boolean {
    return this.open || (
      this.mobileVisible
      && this.resolvedPauseBounds !== null
      && isPointInBounds(
        { x, y },
        this.resolvedPauseBounds ?? pauseButtonBounds(this.layout),
      )
    );
  }

  setMobileVisible(visible: boolean): void {
    this.mobileVisible = visible;
    this.pauseButton.setVisible(visible && !this.open);
  }

  resize(layout: PauseMenuLayout, pauseBounds?: UiBounds | null): void {
    this.layout = layout;
    this.resolvedPauseBounds = pauseBounds;
    this.renderPauseButton();
    if (this.open) this.renderOverlay();
  }

  show(): void {
    if (this.open) return;
    this.open = true;
    this.view = 'main';
    this.pauseButton.setVisible(false);
    this.overlay.setVisible(true);
    this.onPause();
    this.renderOverlay();
  }

  hide(): void {
    if (!this.open) return;
    this.open = false;
    this.overlay.setVisible(false);
    this.overlay.removeAll(true);
    this.pauseButton.setVisible(this.mobileVisible);
    this.onResume();
  }

  destroy(): void {
    this.pauseButton.destroy(true);
    this.overlay.destroy(true);
  }

  private renderPauseButton(): void {
    this.pauseButton.removeAll(true);
    if (this.resolvedPauseBounds === null) {
      this.pauseButton.setVisible(false);
      return;
    }
    const bounds = this.resolvedPauseBounds ?? pauseButtonBounds(this.layout);
    const x = (bounds.left + bounds.right) / 2;
    const y = (bounds.top + bounds.bottom) / 2;
    const buttonWidth = bounds.right - bounds.left;
    const buttonHeight = bounds.bottom - bounds.top;
    const hitTarget = this.scene.add.rectangle(
      x,
      y,
      buttonWidth,
      buttonHeight,
      COLORS.panel,
      0.001,
    )
      .setInteractive({ useHandCursor: true })
      .on('pointerup', () => this.show());
    this.pauseButton.add(hitTarget);
    const visualWidth = Math.min(38, buttonWidth);
    const visualHeight = Math.min(34, buttonHeight);
    const background = this.scene.add.rectangle(
      x,
      y,
      visualWidth,
      visualHeight,
      COLORS.panel,
      0.9,
    )
      .setStrokeStyle(1, COLORS.accent);
    this.pauseButton.add(background);
    const barWidth = Math.min(4, visualWidth * 0.16);
    const barHeight = Math.min(14, visualHeight * 0.45);
    const barGap = Math.min(5, visualWidth * 0.2);
    if (barWidth > 0 && barHeight > 0) {
      const barOffset = barGap / 2 + barWidth / 2;
      this.pauseButton.add([
        this.scene.add.rectangle(
          x - barOffset,
          y,
          barWidth,
          barHeight,
          COLORS.icon,
        ),
        this.scene.add.rectangle(
          x + barOffset,
          y,
          barWidth,
          barHeight,
          COLORS.icon,
        ),
      ]);
    }
    this.pauseButton.setVisible(this.mobileVisible && !this.open);
  }

  private renderOverlay(): void {
    this.overlay.removeAll(true);
    const { width, height, safeArea } = this.layout;
    const left = safeArea.left + 24;
    const right = Math.max(left, width - safeArea.right - 24);
    const top = safeArea.top + 24;
    const bottom = Math.max(top, height - safeArea.bottom - 24);
    const centerX = left + (right - left) / 2;
    const primaryActionWidth = clampPauseActionWidth(220, left, right);

    const blocker = this.scene.add.rectangle(
      width / 2,
      height / 2,
      width,
      height,
      COLORS.backdrop,
      0.88,
    ).setInteractive();
    this.overlay.add(blocker);

    if (this.view === 'settings') {
      this.renderSettings(centerX, top, bottom, primaryActionWidth);
      return;
    }

    const actionLayout = createPauseMenuActionLayout(top, bottom, 3);
    this.addText(
      centerX,
      actionLayout.titleY,
      'PAUSED',
      fitPauseTextFontSize(
        'PAUSED',
        primaryActionWidth,
        actionLayout.titleFontSize,
      ),
      true,
    );
    if (actionLayout.subtitleY !== null) {
      this.addText(
        centerX,
        actionLayout.subtitleY,
        'ZOMBIE HORDE',
        fitPauseTextFontSize('ZOMBIE HORDE', primaryActionWidth, 13),
        false,
        COLORS.muted,
      );
    }
    this.addButton(
      centerX,
      actionLayout.actionYs[0],
      'RESUME',
      () => this.hide(),
      primaryActionWidth,
      actionLayout.buttonHeight,
      actionLayout.buttonFontSize,
    );
    this.addButton(centerX, actionLayout.actionYs[1], 'SETTINGS', () => {
      this.view = 'settings';
      this.renderOverlay();
    }, primaryActionWidth, actionLayout.buttonHeight, actionLayout.buttonFontSize);
    this.addButton(
      centerX,
      actionLayout.actionYs[2],
      'MAIN MENU',
      this.onMainMenu,
      primaryActionWidth,
      actionLayout.buttonHeight,
      actionLayout.buttonFontSize,
    );
  }

  private renderSettings(
    centerX: number,
    top: number,
    bottom: number,
    primaryActionWidth: number,
  ): void {
    const soundEnabled = this.scene.registry.get(GAME_REGISTRY_KEYS.soundEnabled) !== false;
    const actionLayout = createPauseMenuActionLayout(top, bottom, 2);
    this.addText(
      centerX,
      actionLayout.titleY,
      'SETTINGS',
      fitPauseTextFontSize(
        'SETTINGS',
        primaryActionWidth,
        Math.min(32, actionLayout.titleFontSize),
      ),
      true,
    );
    this.addButton(
      centerX,
      actionLayout.actionYs[0],
      soundEnabled ? 'SOUND: ON' : 'SOUND: MUTED',
      () => {
        const next = toggleSound({ soundEnabled });
        this.scene.registry.set(GAME_REGISTRY_KEYS.soundEnabled, next.soundEnabled);
        syncSoundEnabled(this.scene.sound, next.soundEnabled);
        this.renderOverlay();
      },
      primaryActionWidth,
      actionLayout.buttonHeight,
      actionLayout.buttonFontSize,
    );
    this.addButton(centerX, actionLayout.actionYs[1], 'BACK', () => {
      this.view = 'main';
      this.renderOverlay();
    }, Math.min(160, primaryActionWidth), actionLayout.buttonHeight, actionLayout.buttonFontSize);
  }

  private addButton(
    x: number,
    y: number,
    label: string,
    onPress: () => void,
    width = 220,
    height = 46,
    fontSize = 16,
  ): void {
    const background = this.scene.add.rectangle(x, y, width, height, COLORS.panel)
      .setStrokeStyle(1, COLORS.accent)
      .setInteractive({ useHandCursor: true })
      .on('pointerup', onPress);
    this.overlay.add(background);
    const fittedFontSize = fitPauseTextFontSize(label, width, fontSize);
    if (fittedFontSize > 0) {
      this.addText(x, y, label, fittedFontSize, true);
    }
  }

  private addText(
    x: number,
    y: number,
    text: string,
    fontSize: number,
    bold: boolean,
    color: string = COLORS.text,
  ): void {
    const label = this.scene.add.text(x, y, text, {
      color,
      fontFamily: 'Arial, sans-serif',
      fontSize: `${fontSize}px`,
      fontStyle: bold ? 'bold' : 'normal',
      align: 'center',
    }).setOrigin(0.5);
    this.overlay.add(label);
  }
}
