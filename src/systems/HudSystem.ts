import Phaser from 'phaser';

import {
  constrainTooltipWidths,
  createHudLayout,
  handleWeaponSlotPress,
  positionTooltip,
  type HudViewModel,
  type SafeAreaInsets,
  type TooltipPlacement,
  type WeaponSlotIndex,
  type WeaponPickupViewModel,
} from '../logic/hud';
import {
  SEVEN_SEGMENTS,
  segmentsForDigit,
  type SevenSegment,
} from '../logic/sevenSegment';

const STATUS_STYLE: Phaser.Types.GameObjects.Text.TextStyle = {
  color: '#ffffff',
  fontFamily: 'sans-serif',
  fontSize: '16px',
  lineSpacing: 3,
  stroke: '#000000',
  strokeThickness: 3,
};
const RARITY_COLORS = {
  common: 0x9ca5ad,
  uncommon: 0x4fc47a,
  rare: 0x4f8cff,
  epic: 0xb96cff,
  legendary: 0xffa63d,
} as const;

export class HudSystem {
  private readonly statusText: Phaser.GameObjects.Text;
  private readonly ammoText: Phaser.GameObjects.Text;
  private readonly timeGraphics: Phaser.GameObjects.Graphics;
  private readonly timeMetaText: Phaser.GameObjects.Text;
  private readonly gameOverText: Phaser.GameObjects.Text;
  private readonly reloadGraphics: Phaser.GameObjects.Graphics;
  private readonly reloadText: Phaser.GameObjects.Text;
  private readonly waveBannerText: Phaser.GameObjects.Text;
  private readonly waveAnnouncementText: Phaser.GameObjects.Text;
  private readonly weaponSlotGraphics: Phaser.GameObjects.Graphics;
  private readonly weaponIcons: Phaser.GameObjects.Image[];
  private readonly pickupPanel: Phaser.GameObjects.Container;
  private readonly pickupPanelGraphics: Phaser.GameObjects.Graphics;
  private readonly pickupText: Phaser.GameObjects.Text;
  private readonly clockBlinkEvent: Phaser.Time.TimerEvent;
  private waveAnnouncementTween?: Phaser.Tweens.Tween;
  private lastWaveNumber = 0;
  private current?: HudViewModel;
  private reloadLayout?: ReturnType<typeof createHudLayout>['reload'];
  private watchLayout?: ReturnType<typeof createHudLayout>['time'];
  private clockText = '';
  private clockColonVisible = true;
  private hoveredWeaponSlot: number | null = null;
  private viewportWidth = 0;
  private viewportHeight = 0;
  private pickupPanelDefaultPosition = { x: 0, y: 0 };

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly selectWeaponSlot: (slot: WeaponSlotIndex) => void,
  ) {
    this.statusText = scene.add.text(0, 0, '', {
      ...STATUS_STYLE,
      fontSize: '14px',
      lineSpacing: 1,
    }).setDepth(100).setOrigin(1, 0).setScrollFactor(0);
    this.ammoText = scene.add.text(0, 0, '', {
      ...STATUS_STYLE,
      fontStyle: 'bold',
    }).setDepth(100).setOrigin(0, 0).setScrollFactor(0);
    this.timeGraphics = scene.add.graphics().setDepth(100).setScrollFactor(0);
    this.timeMetaText = scene.add.text(0, 0, 'LOCAL        24H', {
      color: '#20251c',
      fontFamily: 'monospace',
      fontSize: '8px',
      fontStyle: 'bold',
    }).setDepth(101).setOrigin(0.5, 0).setScrollFactor(0);
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
    this.waveBannerText = scene.add.text(0, 0, '', {
      ...STATUS_STYLE,
      align: 'center',
      fontSize: '18px',
      fontStyle: 'bold',
    }).setDepth(105).setOrigin(0.5).setScrollFactor(0).setVisible(false);
    this.waveAnnouncementText = scene.add.text(0, 0, '', {
      ...STATUS_STYLE,
      align: 'center',
      fontSize: '30px',
      fontStyle: 'bold',
      strokeThickness: 5,
    }).setDepth(106).setOrigin(0.5).setScrollFactor(0).setVisible(false);
    this.weaponSlotGraphics = scene.add.graphics().setDepth(102).setScrollFactor(0);
    this.weaponIcons = [
      scene.add.image(0, 0, 'weapon-pistol').setDepth(103).setScrollFactor(0),
      scene.add.image(0, 0, 'weapon-pistol').setDepth(103).setScrollFactor(0),
    ];
    this.weaponIcons.forEach((icon, index) => {
      icon.setInteractive({ useHandCursor: true });
      icon.on(Phaser.Input.Events.POINTER_OVER, () => {
        this.hoveredWeaponSlot = index;
        this.showHoveredWeaponTooltip();
      });
      icon.on(Phaser.Input.Events.POINTER_OUT, () => {
        this.hoveredWeaponSlot = null;
        this.showWeaponPickup(null);
      });
      icon.on(
        Phaser.Input.Events.POINTER_DOWN,
        (
          _pointer: Phaser.Input.Pointer,
          _localX: number,
          _localY: number,
          event: Phaser.Types.Input.EventData,
        ) => handleWeaponSlotPress(
          index as WeaponSlotIndex,
          () => event.stopPropagation(),
          this.selectWeaponSlot,
        ),
      );
    });
    this.pickupPanelGraphics = scene.add.graphics();
    this.pickupText = scene.add.text(0, 0, '', {
      color: '#f5f7fa',
      fontFamily: 'sans-serif',
      fontSize: '13px',
      lineSpacing: 4,
      wordWrap: { width: 260 },
    }).setOrigin(0.5);
    this.pickupPanel = scene.add.container(0, 0, [
      this.pickupPanelGraphics,
      this.pickupText,
    ]).setDepth(220).setScrollFactor(0).setVisible(false);
    this.clockBlinkEvent = scene.time.addEvent({
      delay: 500,
      loop: true,
      callback: () => {
        this.clockColonVisible = !this.clockColonVisible;
        this.renderClockText();
      },
    });
  }

  update(viewModel: HudViewModel): void {
    if (this.current?.statusText !== viewModel.statusText) {
      this.statusText.setText(viewModel.statusText);
    }
    if (this.current?.ammoText !== viewModel.ammoText) {
      this.ammoText.setText(viewModel.ammoText);
    }
    if (this.current?.timeText !== viewModel.timeText) {
      this.clockText = viewModel.timeText;
      this.renderClockText();
    }
    if (this.current?.gameOverText !== viewModel.gameOverText) {
      this.gameOverText.setText(viewModel.gameOverText);
    }
    if (this.current?.showGameOver !== viewModel.showGameOver) {
      this.gameOverText.setVisible(viewModel.showGameOver);
    }
    if (this.current?.waveBannerText !== viewModel.waveBannerText) {
      this.waveBannerText
        .setText(viewModel.waveBannerText ?? '')
        .setVisible(viewModel.waveBannerText !== null);
    }
    if (viewModel.waveNumber > 0 && viewModel.waveNumber !== this.lastWaveNumber) {
      this.playWaveAnnouncement(viewModel.waveNumber);
    }
    this.lastWaveNumber = viewModel.waveNumber;

    this.drawReloadFeedback(viewModel.reloadProgress, viewModel.reloadPrompt);
    this.drawWeaponSlots(viewModel);

    this.current = viewModel;
    this.showHoveredWeaponTooltip();
  }

  resize(width: number, height: number, safeArea: SafeAreaInsets): void {
    this.viewportWidth = width;
    this.viewportHeight = height;
    const layout = createHudLayout(width, height, safeArea);

    this.statusText.setPosition(layout.status.x, layout.status.y);
    this.ammoText.setPosition(layout.ammo.x, layout.ammo.y);
    this.drawWatch(layout.time);
    this.gameOverText.setPosition(layout.gameOver.x, layout.gameOver.y);
    this.reloadLayout = layout.reload;
    this.reloadText.setPosition(layout.reload.x + layout.reload.width / 2, layout.reload.y - 5);
    this.waveBannerText.setPosition(layout.waveBanner.x, layout.waveBanner.y);
    this.waveAnnouncementText.setPosition(layout.waveBanner.x, layout.waveBanner.y);
    this.positionWeaponSlots(layout.time.x, layout.time.y + layout.time.height + 30);
    this.pickupPanelDefaultPosition = {
      x: width / 2,
      y: Math.min(height - 125, height * 0.68),
    };
    this.pickupPanel.setPosition(
      this.pickupPanelDefaultPosition.x,
      this.pickupPanelDefaultPosition.y,
    );
    this.drawReloadFeedback(
      this.current?.reloadProgress ?? null,
      this.current?.reloadPrompt ?? null,
    );
  }

  destroy(): void {
    this.clockBlinkEvent.remove(false);
    this.statusText.destroy();
    this.ammoText.destroy();
    this.timeGraphics.destroy();
    this.timeMetaText.destroy();
    this.gameOverText.destroy();
    this.reloadGraphics.destroy();
    this.reloadText.destroy();
    this.waveAnnouncementTween?.stop();
    this.waveBannerText.destroy();
    this.waveAnnouncementText.destroy();
    this.weaponSlotGraphics.destroy();
    this.weaponIcons.forEach((icon) => icon.destroy());
    this.pickupPanel.destroy();
  }

  showWeaponPickup(
    viewModel: WeaponPickupViewModel | null,
    fieldPosition?: { x: number; y: number },
    placement: TooltipPlacement = 'above',
  ): void {
    if (!viewModel) {
      this.pickupPanel.setVisible(false);
      return;
    }

    const tooltipWidths = constrainTooltipWidths(this.viewportWidth);
    this.pickupText.setWordWrapWidth(tooltipWidths.textWrapWidth);
    const rarity = viewModel.rarity.toUpperCase();
    this.pickupText.setText([
      `${viewModel.name}  ·  ${rarity}`,
      viewModel.description,
      `FIRE RATE ${viewModel.fireRateText}   RECOIL ${viewModel.recoil}`,
      `MAGAZINE ${viewModel.magazineSize}`,
      viewModel.interactionText,
    ]);
    const bounds = this.pickupText.getBounds();
    const width = Math.min(
      tooltipWidths.panelMaxWidth,
      Math.max(260, bounds.width + 32),
    );
    const height = bounds.height + 26;
    const position = fieldPosition
      ? positionTooltip(
        fieldPosition,
        { width, height },
        { width: this.viewportWidth, height: this.viewportHeight },
        placement,
      )
      : this.pickupPanelDefaultPosition;
    this.pickupPanel.setPosition(position.x, position.y);
    this.pickupPanelGraphics
      .clear()
      .fillStyle(0x101820, 0.94)
      .fillRoundedRect(-width / 2, -height / 2, width, height, 8)
      .lineStyle(2, RARITY_COLORS[viewModel.rarity], 1)
      .strokeRoundedRect(-width / 2, -height / 2, width, height, 8);
    this.pickupPanel.setVisible(true);
  }

  isWeaponSlotHovered(): boolean {
    return this.hoveredWeaponSlot !== null;
  }

  private renderClockText(): void {
    if (this.watchLayout) this.drawWatch(this.watchLayout);
  }

  private playWaveAnnouncement(waveNumber: number): void {
    this.waveAnnouncementTween?.stop();
    this.waveAnnouncementText
      .setText(`WAVE ${waveNumber}`)
      .setAlpha(1)
      .setScale(0.92)
      .setVisible(true);
    this.waveAnnouncementTween = this.scene.tweens.add({
      targets: this.waveAnnouncementText,
      alpha: 0,
      scale: 1.08,
      delay: 350,
      duration: 850,
      ease: 'Sine.Out',
      onComplete: () => {
        this.waveAnnouncementText.setVisible(false);
        this.waveAnnouncementTween = undefined;
      },
    });
  }

  private drawWatch(layout: ReturnType<typeof createHudLayout>['time']): void {
    this.watchLayout = layout;
    const { x, y, width, height } = layout;
    const left = x - width / 2;
    const inset = 6;

    this.timeGraphics
      .clear()
      .fillStyle(0x111513, 0.96)
      .fillRoundedRect(left, y, width, height, 7)
      .lineStyle(2, 0x3f4842, 1)
      .strokeRoundedRect(left + 1, y + 1, Math.max(0, width - 2), height - 2, 6)
      .fillStyle(0xa7ae82, 1)
      .fillRoundedRect(
        left + inset,
        y + inset,
        Math.max(0, width - inset * 2),
        height - inset * 2,
        2,
      );
    this.timeMetaText.setPosition(x, y + 8);
    this.drawSegmentTime(x, y + 17);
  }

  private drawSegmentTime(centerX: number, top: number): void {
    const digits = this.clockText.replace(':', '').padStart(4, '0').slice(-4);
    const digitWidth = 13;
    const digitGap = 3;
    const colonWidth = 6;
    const totalWidth = digitWidth * 4 + digitGap * 3 + colonWidth;
    let x = centerX - totalWidth / 2;

    for (let index = 0; index < digits.length; index += 1) {
      this.drawSegmentDigit(x, top, digits[index]);
      x += digitWidth;

      if (index === 1) {
        x += colonWidth / 2;
        this.timeGraphics.fillStyle(0x151a13, this.clockColonVisible ? 0.9 : 0.1);
        this.timeGraphics.fillCircle(x, top + 7, 1.3);
        this.timeGraphics.fillCircle(x, top + 15, 1.3);
        x += colonWidth / 2;
      }

      if (index < digits.length - 1) x += digitGap;
    }
  }

  private drawSegmentDigit(x: number, y: number, digit: string): void {
    const active = new Set(segmentsForDigit(digit));

    for (const segment of SEVEN_SEGMENTS) {
      this.timeGraphics.fillStyle(0x151a13, active.has(segment) ? 0.92 : 0.1);
      this.drawSegment(x, y, segment);
    }
  }

  private drawSegment(x: number, y: number, segment: SevenSegment): void {
    const horizontal = {
      a: { x: x + 2, y, width: 9, height: 3 },
      g: { x: x + 2, y: y + 10, width: 9, height: 3 },
      d: { x: x + 2, y: y + 20, width: 9, height: 3 },
    } as const;
    const vertical = {
      f: { x, y: y + 2, width: 3, height: 8 },
      b: { x: x + 10, y: y + 2, width: 3, height: 8 },
      e: { x, y: y + 12, width: 3, height: 8 },
      c: { x: x + 10, y: y + 12, width: 3, height: 8 },
    } as const;
    const bounds = segment === 'a' || segment === 'g' || segment === 'd'
      ? horizontal[segment]
      : vertical[segment];

    this.timeGraphics.fillRoundedRect(
      bounds.x,
      bounds.y,
      bounds.width,
      bounds.height,
      1,
    );
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

  private positionWeaponSlots(centerX: number, centerY: number): void {
    const gap = 8;
    const size = 46;
    this.weaponIcons[0].setPosition(centerX - size / 2 - gap / 2, centerY);
    this.weaponIcons[1].setPosition(centerX + size / 2 + gap / 2, centerY);
    this.drawWeaponSlots(this.current);
  }

  private drawWeaponSlots(viewModel?: HudViewModel): void {
    if (!viewModel) return;
    const size = 46;
    this.weaponSlotGraphics.clear();

    viewModel.weaponSlots.forEach((weapon, index) => {
      const icon = this.weaponIcons[index];
      const x = icon.x;
      const y = icon.y;
      const active = index === viewModel.activeWeaponSlot;
      const backgroundColor = weapon ? RARITY_COLORS[weapon.rarity] : 0x161b20;
      this.weaponSlotGraphics
        .fillStyle(backgroundColor, weapon ? 0.72 : 0.9)
        .fillRoundedRect(x - size / 2, y - size / 2, size, size, 4)
        .lineStyle(active ? 3 : 1, active ? 0x65b5ff : 0x7d8790, 1)
        .strokeRoundedRect(x - size / 2, y - size / 2, size, size, 4);
      if (weapon) {
        icon
          .setTexture(weapon.id === 'pistol' ? 'weapon-pistol' : 'weapon-rifle')
          .setDisplaySize(38, 38)
          .setVisible(true);
      } else {
        icon.setVisible(false);
      }
    });
  }

  private showHoveredWeaponTooltip(): void {
    if (this.hoveredWeaponSlot === null || !this.current) return;
    const weapon = this.current.weaponSlots[this.hoveredWeaponSlot];
    if (!weapon) {
      this.showWeaponPickup(null);
      return;
    }
    const icon = this.weaponIcons[this.hoveredWeaponSlot];
    this.showWeaponPickup({
      name: weapon.name,
      description: weapon.description,
      rarity: weapon.rarity,
      fireRateText: weapon.fireRateText,
      recoil: weapon.recoil,
      magazineSize: weapon.magazineSize,
      interactionText: `WEAPON SLOT ${this.hoveredWeaponSlot + 1}`,
    }, { x: icon.x, y: icon.y + 24 }, 'below');
  }
}
