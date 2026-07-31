import Phaser from 'phaser';

import { GAME_REGISTRY_KEYS } from '../config/menuConfig';
import { syncSoundEnabled } from '../effects/audioSettings';
import { toggleSound } from '../logic/menu';
import {
  clampPauseActionWidth,
  createPauseMenuActionLayout,
  isPointInBounds,
  pauseButtonBounds,
} from '../logic/pauseMenu';

type PauseMenuView = 'main' | 'settings';

const COLORS = {
  backdrop: 0x071018,
  panel: 0x1b252e,
  border: 0x6f8798,
  accent: 0xd7b45a,
  text: '#eef4f7',
  muted: '#9aabb5',
} as const;

export interface PauseMenuLayout {
  width: number;
  height: number;
  safeArea: { top: number; right: number; bottom: number; left: number };
}

export class PauseMenu {
  private readonly scene: Phaser.Scene;
  private readonly onResume: () => void;
  private readonly onMainMenu: () => void;
  private readonly pauseButton: Phaser.GameObjects.Container;
  private readonly overlay: Phaser.GameObjects.Container;
  private layout: PauseMenuLayout;
  private view: PauseMenuView = 'main';
  private open = false;
  private mobileVisible = false;

  constructor(
    scene: Phaser.Scene,
    layout: PauseMenuLayout,
    onResume: () => void,
    onMainMenu: () => void,
  ) {
    this.scene = scene;
    this.layout = layout;
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
      && isPointInBounds({ x, y }, pauseButtonBounds(this.layout))
    );
  }

  setMobileVisible(visible: boolean): void {
    this.mobileVisible = visible;
    this.pauseButton.setVisible(visible && !this.open);
  }

  resize(layout: PauseMenuLayout): void {
    this.layout = layout;
    this.renderPauseButton();
    if (this.open) this.renderOverlay();
  }

  show(): void {
    if (this.open) return;
    this.open = true;
    this.view = 'main';
    this.pauseButton.setVisible(false);
    this.overlay.setVisible(true);
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
    const bounds = pauseButtonBounds(this.layout);
    const x = (bounds.left + bounds.right) / 2;
    const y = (bounds.top + bounds.bottom) / 2;
    const background = this.scene.add.rectangle(x, y, 76, 38, COLORS.panel, 0.9)
      .setStrokeStyle(1, COLORS.accent)
      .setInteractive({ useHandCursor: true })
      .on('pointerup', () => this.show());
    const label = this.scene.add.text(x, y, 'PAUSE', {
      color: COLORS.text,
      fontFamily: 'Arial, sans-serif',
      fontSize: '12px',
      fontStyle: 'bold',
    }).setOrigin(0.5);
    this.pauseButton.add([background, label]);
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
      actionLayout.titleFontSize,
      true,
    );
    if (actionLayout.subtitleY !== null) {
      this.addText(
        centerX,
        actionLayout.subtitleY,
        'ZOMBIE HORDE',
        13,
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
      Math.min(32, actionLayout.titleFontSize),
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
    this.addText(x, y, label, fontSize, true);
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
