import type Phaser from 'phaser';
import { GAME_REGISTRY_KEYS } from '../config/menuConfig';
import { syncSoundEnabled } from '../effects/audioSettings';
import { createSettingsLayout } from '../logic/settingsLayout';
import { setLanguage, t, userSettings } from './UserSettings';

/** Shared settings view for the main menu and the paused game. */
export class SettingsPanel {
  readonly container: Phaser.GameObjects.Container;
  constructor(
    private readonly owner: Phaser.Scene,
    private readonly bounds: { left: number; right: number; top: number; bottom: number },
    private readonly close: () => void,
  ) {
    this.container = owner.add.container(0, 0);
    this.render();
  }

  private render(): void {
    this.container.removeAll(true);
    const { left, right, top, bottom } = this.bounds;
    const layout = createSettingsLayout(right - left, bottom - top);
    const centerX = (left + right) / 2;
    const panelTop = (top + bottom - layout.height) / 2;
    const panel = this.owner.add.rectangle(centerX, panelTop + layout.height / 2,
      layout.width, layout.height, 0x201e1b, 1).setStrokeStyle(1, 0x645f58);
    this.container.add(panel);
    this.container.add(this.owner.add.rectangle(centerX, panelTop + 2, layout.width - 2, 3, 0xb0443e));
    this.label(centerX, panelTop + layout.titleY, t('SETTINGS'), 25 * layout.fontScale, '#f0ece5');
    this.button(centerX, panelTop + layout.soundY,
      t(userSettings.soundEnabled ? 'SOUND: ON' : 'SOUND: MUTED'), layout.innerWidth, layout.buttonHeight, false, () => {
        const soundEnabled = !userSettings.soundEnabled;
        userSettings.update({ soundEnabled });
        this.owner.registry.set(GAME_REGISTRY_KEYS.soundEnabled, soundEnabled);
        syncSoundEnabled(this.owner.sound, soundEnabled);
        this.render();
      });
    this.label(centerX - layout.innerWidth / 2, panelTop + layout.languageLabelY,
      t('LANGUAGE'), 13 * layout.fontScale, '#bcb5ab', 0);
    for (const [index, locale] of (['en', 'ko'] as const).entries()) {
      const selected = userSettings.locale === locale;
      this.button(centerX + (index === 0 ? -1 : 1) * layout.optionOffset,
        panelTop + layout.languageY,
        `${selected ? '✓  ' : ''}${locale === 'en' ? 'English' : '한국어'}`,
        layout.optionWidth, layout.buttonHeight, selected, () => {
          setLanguage(locale);
          this.render();
        }, `flag-${locale}`);
    }
    this.button(centerX, panelTop + layout.closeY, t('CLOSE'), layout.innerWidth,
      layout.buttonHeight, false, this.close);
  }

  private label(x: number, y: number, text: string, size: number, color: string, originX = 0.5): void {
    this.container.add(this.owner.add.text(x, y, text, {
      fontFamily: 'Arial, sans-serif', fontSize: `${size}px`, fontStyle: 'bold', color,
    }).setOrigin(originX, 0.5));
  }

  private button(x: number, y: number, text: string, width: number, height: number, selected: boolean, action: () => void, flagTexture?: string): void {
    const fill = selected ? 0x763833 : 0x302d28;
    const rectangle = this.owner.add.rectangle(x, y, width, height, fill)
      .setStrokeStyle(selected ? 2 : 1, selected ? 0xdf8c7d : 0x71685f)
      .setInteractive({ useHandCursor: true })
      .on('pointerover', () => rectangle.setFillStyle(selected ? 0x87433d : 0x403a33))
      .on('pointerout', () => rectangle.setFillStyle(fill))
      .on('pointerup', action);
    this.container.add(rectangle);
    const label = this.owner.add.text(x, y, text, {
      fontFamily: 'Arial, sans-serif', fontSize: `${Math.min(16, height * 0.38)}px`,
      fontStyle: 'bold', color: '#f0ece5',
    }).setOrigin(0.5);
    const flagWidth = flagTexture ? 28 : 0;
    const gap = flagTexture ? 8 : 0;
    const contentWidth = flagWidth + gap + label.width;
    const contentScale = Math.min(1, Math.max(0, (width - 16) / contentWidth));
    label.setScale(contentScale);
    label.x = x + (flagWidth + gap) * contentScale / 2;
    if (flagTexture) {
      const flag = this.owner.add.image(
        x - contentWidth * contentScale / 2 + flagWidth * contentScale / 2,
        y,
        flagTexture,
      );
      flag.setScale(flagWidth * contentScale / flag.width);
      this.container.add(flag);
    }
    this.container.add(label);
  }
}
