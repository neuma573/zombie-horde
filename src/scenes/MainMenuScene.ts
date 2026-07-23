import Phaser from 'phaser';

import {
  CHARACTER_CLASS_OPTIONS,
  DEFAULT_GAME_SETTINGS,
  GAME_REGISTRY_KEYS,
  type CharacterClassOption,
  type CharacterClassId,
} from '../config/menuConfig';
import { selectCharacterClass, toggleSound } from '../logic/menu';

type MenuView = 'main' | 'settings' | 'classSelect';

const COLORS = {
  background: 0x11161c,
  panel: 0x1b252e,
  panelSelected: 0x29475b,
  border: 0x6f8798,
  accent: 0xd7b45a,
  text: '#eef4f7',
  muted: '#9aabb5',
  disabled: 0x46515a,
} as const;

export class MainMenuScene extends Phaser.Scene {
  private view: MenuView = 'main';
  private selectedClassId: CharacterClassId | null = null;
  private ui?: Phaser.GameObjects.Container;

  constructor() {
    super('MainMenuScene');
  }

  preload(): void {
    for (const option of CHARACTER_CLASS_OPTIONS) {
      if (option.portraitUrl) {
        this.load.image(option.portraitTextureKey, option.portraitUrl);
      }
    }
  }

  create(): void {
    if (!this.registry.has(GAME_REGISTRY_KEYS.soundEnabled)) {
      this.registry.set(
        GAME_REGISTRY_KEYS.soundEnabled,
        DEFAULT_GAME_SETTINGS.soundEnabled,
      );
    }

    this.scale.on(Phaser.Scale.Events.RESIZE, this.render, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.scale.off(Phaser.Scale.Events.RESIZE, this.render, this);
      this.ui?.destroy(true);
      this.ui = undefined;
    });
    this.render();
  }

  private render(): void {
    this.ui?.destroy(true);
    this.cameras.main.setBackgroundColor(COLORS.background);

    const safe = this.readSafeArea();
    const left = safe.left + 24;
    const right = Math.max(left, this.scale.width - safe.right - 24);
    const top = safe.top + 24;
    const bottom = Math.max(top, this.scale.height - safe.bottom - 24);
    const width = Math.max(0, right - left);
    const height = Math.max(0, bottom - top);
    const centerX = left + width / 2;
    const centerY = top + height / 2;

    this.ui = this.add.container(0, 0).setDepth(10);
    const background = this.add.rectangle(
      this.scale.width / 2,
      this.scale.height / 2,
      this.scale.width,
      this.scale.height,
      COLORS.background,
    );
    this.ui.add(background);

    if (this.view === 'settings') {
      this.renderSettings(centerX, centerY, top, bottom);
      return;
    }
    if (this.view === 'classSelect') {
      this.renderClassSelect(left, right, top, bottom);
      return;
    }
    this.renderMain(centerX, centerY, top);
  }

  private renderMain(centerX: number, centerY: number, top: number): void {
    const titleSize = Math.min(40, Math.max(26, this.scale.width / 12));
    this.addText(
      centerX,
      Math.max(top + 36, centerY - 150),
      'ZOMBIE HORDE',
      titleSize,
      true,
    );
    this.addText(
      centerX,
      Math.max(top + 82, centerY - 100),
      'INFINITE DEFENSE',
      14,
      false,
      COLORS.muted,
    );
    this.addButton(centerX, centerY, 'START GAME', () => {
      this.view = 'classSelect';
      this.render();
    });
    this.addButton(centerX, centerY + 64, 'SETTINGS', () => {
      this.view = 'settings';
      this.render();
    });
  }

  private renderSettings(
    centerX: number,
    centerY: number,
    top: number,
    bottom: number,
  ): void {
    const soundEnabled = this.registry.get(GAME_REGISTRY_KEYS.soundEnabled) !== false;
    this.addText(centerX, Math.max(top + 34, centerY - 130), 'SETTINGS', 32, true);
    this.addButton(
      centerX,
      centerY - 20,
      soundEnabled ? 'SOUND: ON' : 'SOUND: MUTED',
      () => {
        const next = toggleSound({ soundEnabled });
        this.registry.set(GAME_REGISTRY_KEYS.soundEnabled, next.soundEnabled);
        this.render();
      },
    );
    this.addButton(centerX, Math.min(bottom - 28, centerY + 72), 'BACK', () => {
      this.view = 'main';
      this.render();
    }, 160);
  }

  private renderClassSelect(
    left: number,
    right: number,
    top: number,
    bottom: number,
  ): void {
    const width = right - left;
    const centerX = left + width / 2;
    const isMobileLayout = width < 620;
    this.addText(centerX, top + 20, 'SELECT CLASS', 30, true);
    this.addText(centerX, top + 56, 'CHOOSE YOUR SURVIVOR', 13, false, COLORS.muted);

    const cardGap = Math.min(14, Math.max(8, width * 0.025));
    const cardTop = top + 88;
    const actionY = bottom - 26;
    const cardBottom = actionY - 42;
    const availableCardHeight = Math.max(150, cardBottom - cardTop);
    const cardWidth = isMobileLayout
      ? width
      : Math.min(300, Math.max(1, (width - cardGap) / 2));
    const cardHeight = isMobileLayout
      ? Math.min(260, Math.max(100, (availableCardHeight - cardGap) / 2))
      : Math.min(410, availableCardHeight);
    const cardsCenterY = cardTop + availableCardHeight / 2;
    const mobileGroupHeight = cardHeight * 2 + cardGap;
    const mobileStartY = cardsCenterY - mobileGroupHeight / 2 + cardHeight / 2;

    CHARACTER_CLASS_OPTIONS.forEach((option, index) => {
      const x = isMobileLayout
        ? centerX
        : centerX + (index === 0
          ? -(cardWidth + cardGap) / 2
          : (cardWidth + cardGap) / 2);
      const y = isMobileLayout
        ? mobileStartY + index * (cardHeight + cardGap)
        : cardsCenterY;
      this.addClassCard(
        x,
        y,
        cardWidth,
        cardHeight,
        option,
        index,
        isMobileLayout,
      );
    });

    this.addButton(left + 82, actionY, 'BACK', () => {
      this.view = 'main';
      this.render();
    }, 140);
    this.addButton(
      right - 92,
      actionY,
      'DEPLOY',
      () => this.startGame(),
      160,
      this.selectedClassId !== null,
    );
  }

  private addClassCard(
    x: number,
    y: number,
    width: number,
    height: number,
    option: CharacterClassOption,
    optionIndex: number,
    isMobileLayout: boolean,
  ): void {
    const selected = this.selectedClassId === option.id;
    const borderColor = selected ? COLORS.accent : COLORS.border;
    const card = this.add.rectangle(
      x,
      y,
      width,
      height,
      selected ? COLORS.panelSelected : COLORS.panel,
      0.96,
    ).setStrokeStyle(selected ? 4 : 1, borderColor);
    card.setInteractive({ useHandCursor: true }).on('pointerup', () => {
      this.selectedClassId = selectCharacterClass(this.selectedClassId, option.id);
      this.render();
    });
    this.ui?.add(card);

    const accent = this.add.graphics();
    accent.fillStyle(selected ? COLORS.accent : 0x334756, selected ? 1 : 0.75);
    if (optionIndex === 0) {
      accent.fillTriangle(
        x - width / 2,
        y - height / 2,
        x - width / 2 + Math.min(44, width * 0.28),
        y - height / 2,
        x - width / 2,
        y - height / 2 + Math.min(80, height * 0.2),
      );
    } else {
      accent.fillTriangle(
        x + width / 2,
        y - height / 2,
        x + width / 2 - Math.min(44, width * 0.28),
        y - height / 2,
        x + width / 2,
        y - height / 2 + Math.min(80, height * 0.2),
      );
    }
    this.ui?.add(accent);

    const direction = optionIndex === 0 ? -1 : 1;
    const portraitX = isMobileLayout ? x + direction * width * 0.23 : x;
    const labelX = isMobileLayout ? x - direction * width * 0.23 : x;
    const portraitY = isMobileLayout ? y : y - 20;
    const portraitHeight = Math.max(80, height - (isMobileLayout ? 12 : 66));
    const portraitWidth = isMobileLayout
      ? Math.max(1, width * 0.46)
      : Math.max(1, width - 10);
    let portrait: Phaser.GameObjects.Image | undefined;
    if (option.portraitUrl && this.textures.exists(option.portraitTextureKey)) {
      portrait = this.add.image(portraitX, portraitY, option.portraitTextureKey);
      portrait.setCrop(
        option.portraitCrop.x,
        option.portraitCrop.y,
        option.portraitCrop.width,
        option.portraitCrop.height,
      );
      const portraitScale = Math.min(
        portraitWidth / option.portraitCrop.width,
        portraitHeight / option.portraitCrop.height,
      );
      portrait.setScale(portraitScale * (selected ? 1 : 0.86));
      this.ui?.add(portrait);
    } else {
      const silhouette = this.add.graphics();
      silhouette.fillStyle(0x71808a, 0.9);
      silhouette.fillCircle(
        portraitX,
        portraitY - portraitHeight * 0.18,
        Math.min(22, portraitHeight * 0.16),
      );
      silhouette.fillRoundedRect(
        portraitX - Math.min(38, portraitWidth * 0.28),
        portraitY,
        Math.min(76, width * 0.36),
        Math.max(30, portraitHeight * 0.36),
        12,
      );
      this.ui?.add(silhouette);
    }
    const labelY = y + height / 2 - 24;
    this.addText(
      labelX,
      isMobileLayout ? y - 16 : labelY - 8,
      option.name,
      isMobileLayout ? 22 : width < 170 ? 13 : 16,
      true,
    );
    this.addText(
      labelX,
      isMobileLayout ? y + 16 : labelY + 13,
      option.roleLabel,
      isMobileLayout ? 11 : 10,
      false,
      COLORS.muted,
    );
    if (selected) {
      this.addText(
        labelX,
        isMobileLayout ? y + 48 : labelY - 38,
        'SELECTED',
        11,
        true,
        '#f4d675',
      );
      if (portrait) {
        this.tweens.add({
          targets: portrait,
          y: portrait.y - 6,
          duration: 180,
          ease: 'Back.Out',
        });
      }
    }
  }

  private addButton(
    x: number,
    y: number,
    label: string,
    onPress: () => void,
    width = 220,
    enabled = true,
  ): void {
    const background = this.add.rectangle(
      x,
      y,
      width,
      46,
      enabled ? COLORS.panel : COLORS.disabled,
      enabled ? 1 : 0.65,
    ).setStrokeStyle(1, enabled ? COLORS.accent : COLORS.border);
    if (enabled) {
      background.setInteractive({ useHandCursor: true }).on('pointerup', onPress);
    }
    this.ui?.add(background);
    this.addText(x, y, label, 16, true, enabled ? COLORS.text : COLORS.muted);
  }

  private addText(
    x: number,
    y: number,
    text: string,
    fontSize: number,
    bold: boolean,
    color: string = COLORS.text,
  ): Phaser.GameObjects.Text {
    const object = this.add.text(x, y, text, {
      color,
      fontFamily: 'Arial, sans-serif',
      fontSize: `${fontSize}px`,
      fontStyle: bold ? 'bold' : 'normal',
      align: 'center',
    }).setOrigin(0.5);
    this.ui?.add(object);
    return object;
  }

  private startGame(): void {
    if (this.selectedClassId === null) return;
    this.registry.set(GAME_REGISTRY_KEYS.characterClassId, this.selectedClassId);
    this.scene.start('GameScene');
  }

  private readSafeArea(): { top: number; right: number; bottom: number; left: number } {
    const parent = this.game.canvas.parentElement ?? this.game.canvas;
    const style = window.getComputedStyle(parent);
    const read = (name: string): number => Number.parseFloat(style.getPropertyValue(name)) || 0;

    return {
      top: read('--safe-area-top'),
      right: read('--safe-area-right'),
      bottom: read('--safe-area-bottom'),
      left: read('--safe-area-left'),
    };
  }
}
