import Phaser from 'phaser';

import {
  advanceDelayedGauge,
  createDelayedGaugeState,
  type DelayedGaugeState,
} from '../effects/delayedGauge';

import {
  constrainTooltipWidths,
  countNewShots,
  createAmmoDisplayLayout,
  createAmmoEjectionMotion,
  createAmmoRoundYPositions,
  createHudLayout,
  ejectsCasingOnFire,
  extractedSpentCasings,
  fitClockRenderScale,
  handleWeaponSlotPress,
  positionTooltip,
  retainsSpentShotgunShells,
  type HudLayout,
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
import type { WeaponId } from '../logic/weapon';

function ammoTextureKey(weaponId: WeaponId | null): string {
  if (weaponId === 'pistol') return 'ammo-pistol';
  if (weaponId === 'doubleBarrelShotgun') return 'ammo-shotgun';
  return 'ammo-rifle';
}

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
const WATCH_RENDER_HEIGHT = 48;

export class HudSystem {
  private readonly statusText: Phaser.GameObjects.Text;
  private readonly ammoText: Phaser.GameObjects.Text;
  private readonly ammoRounds: Phaser.GameObjects.Image[] = [];
  private readonly spentShotgunShells: Phaser.GameObjects.Image[] = [];
  private readonly timeGraphics: Phaser.GameObjects.Graphics;
  private readonly statusBarGraphics: Phaser.GameObjects.Graphics;
  private readonly timeMetaText: Phaser.GameObjects.Text;
  private readonly gameOverText: Phaser.GameObjects.Text;
  private readonly reloadGraphics: Phaser.GameObjects.Graphics;
  private readonly reloadText: Phaser.GameObjects.Text;
  private readonly waveBannerText: Phaser.GameObjects.Text;
  private readonly waveTagText: Phaser.GameObjects.Text;
  private readonly waveAnnouncementText: Phaser.GameObjects.Text;
  private readonly weaponSlotGraphics: Phaser.GameObjects.Graphics;
  private readonly weaponIcons: Phaser.GameObjects.Image[];
  private weaponSlotLayout?: ReturnType<typeof createHudLayout>['weaponSlots'];
  private readonly pickupPanel: Phaser.GameObjects.Container;
  private readonly pickupPanelGraphics: Phaser.GameObjects.Graphics;
  private readonly pickupText: Phaser.GameObjects.Text;
  private readonly clockBlinkEvent: Phaser.Time.TimerEvent;
  private waveAnnouncementTween?: Phaser.Tweens.Tween;
  private ammoFeedTween?: Phaser.Tweens.Tween;
  private lastWaveNumber = 0;
  private current?: HudViewModel;
  private delayedHealth?: DelayedGaugeState;
  private reloadLayout?: ReturnType<typeof createHudLayout>['reload'];
  private watchLayout?: ReturnType<typeof createHudLayout>['time'];
  private statusMaxWidth: number | null = null;
  private statusMaxHeight: number | null = null;
  private ammoMaxWidth: number | null = null;
  private ammoMaxHeight: number | null = null;
  private hudLayout?: HudLayout;
  private topHudVisible = true;
  private mobileInputMode = false;
  private mobileInteraction: { x: number; y: number; radius: number } | null = null;
  private clockText = '';
  private clockColonVisible = true;
  private hoveredWeaponSlot: number | null = null;
  private viewportWidth = 0;
  private viewportHeight = 0;
  private safeArea: SafeAreaInsets = { top: 0, right: 0, bottom: 0, left: 0 };
  private pickupPanelDefaultPosition = { x: 0, y: 0 };

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly selectWeaponSlot: (slot: WeaponSlotIndex) => void,
    private readonly randomSource: () => number = Math.random,
  ) {
    this.statusText = scene.add.text(0, 0, '', {
      ...STATUS_STYLE,
      fontSize: '14px',
      lineSpacing: 1,
    }).setDepth(100).setOrigin(1, 0).setScrollFactor(0);
    this.ammoText = scene.add.text(0, 0, '', {
      ...STATUS_STYLE,
      fontSize: '12px',
      fontStyle: 'bold',
    }).setDepth(100).setOrigin(0, 0).setScrollFactor(0);
    this.timeGraphics = scene.add.graphics().setDepth(100).setScrollFactor(0);
    this.statusBarGraphics = scene.add.graphics().setDepth(100).setScrollFactor(0);
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
    this.waveTagText = scene.add.text(0, 0, '#Wave--', {
      color: '#7f8985',
      fontFamily: 'monospace',
      fontSize: '12px',
      fontStyle: 'bold',
      stroke: '#101513',
      strokeThickness: 2,
    }).setDepth(100).setOrigin(0, 0).setScrollFactor(0);
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

  update(viewModel: HudViewModel, deltaMs = 0): void {
    if (this.current?.statusText !== viewModel.statusText) {
      this.statusText.setText(viewModel.statusText);
      this.fitStatusText();
    }
    if (this.current?.ammoText !== viewModel.ammoText) {
      this.ammoText.setText(viewModel.ammoText);
      this.fitAmmoText();
    }
    this.updateAmmoRounds(viewModel);
    if (this.current?.timeText !== viewModel.timeText) {
      this.clockText = viewModel.timeText;
      this.renderClockText();
    }
    if (this.current?.waveTagText !== viewModel.waveTagText) {
      this.waveTagText.setText(viewModel.waveTagText);
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
    this.delayedHealth = this.delayedHealth
      ? advanceDelayedGauge(this.delayedHealth, viewModel.healthRatio, deltaMs)
      : createDelayedGaugeState(viewModel.healthRatio);
    this.drawStatusBars(viewModel);

    this.current = viewModel;
    this.showHoveredWeaponTooltip();
  }

  resize(
    width: number,
    height: number,
    safeArea: SafeAreaInsets,
    resolvedLayout?: HudLayout,
  ): void {
    this.viewportWidth = width;
    this.viewportHeight = height;
    this.safeArea = { ...safeArea };
    const layout = resolvedLayout ?? createHudLayout(width, height, safeArea);

    this.statusText
      .setOrigin(layout.status.originX, 0)
      .setPosition(layout.status.x, layout.status.y)
      .setVisible(layout.topHudVisible);
    this.statusMaxWidth = layout.status.maxWidth;
    this.statusMaxHeight = layout.status.maxHeight;
    this.fitStatusText();
    this.hudLayout = layout;
    this.topHudVisible = layout.topHudVisible;
    this.layoutAmmoRounds();
    this.drawWatch(layout.time);
    this.drawStatusBars(this.current);
    this.timeGraphics.setVisible(layout.topHudVisible);
    this.timeMetaText.setVisible(layout.topHudVisible);
    this.gameOverText.setPosition(layout.gameOver.x, layout.gameOver.y);
    this.reloadLayout = layout.reload;
    this.reloadText.setPosition(layout.reload.x + layout.reload.width / 2, layout.reload.y - 5);
    this.waveBannerText.setPosition(layout.waveBanner.x, layout.waveBanner.y);
    this.waveTagText
      .setPosition(layout.waveTag.x, layout.waveTag.y)
      .setVisible(layout.topHudVisible);
    this.waveAnnouncementText.setPosition(layout.waveBanner.x, layout.waveBanner.y);
    this.positionWeaponSlots(layout.weaponSlots);
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

  setMobileInputMode(
    enabled: boolean,
    interaction: { x: number; y: number; radius: number } | null = null,
  ): void {
    this.mobileInputMode = enabled;
    this.mobileInteraction = enabled ? interaction : null;
    if (enabled && this.hoveredWeaponSlot !== null) {
      this.hoveredWeaponSlot = null;
      this.showWeaponPickup(null);
    }
  }

  applyLayout(
    width: number,
    height: number,
    safeArea: SafeAreaInsets,
    layout: HudLayout,
  ): void {
    this.resize(width, height, safeArea, layout);
  }

  destroy(): void {
    this.clockBlinkEvent.remove(false);
    this.statusText.destroy();
    this.ammoText.destroy();
    this.ammoRounds.forEach((round) => round.destroy());
    this.spentShotgunShells.forEach((round) => round.destroy());
    this.timeGraphics.destroy();
    this.statusBarGraphics.destroy();
    this.timeMetaText.destroy();
    this.gameOverText.destroy();
    this.reloadGraphics.destroy();
    this.reloadText.destroy();
    this.waveAnnouncementTween?.stop();
    this.ammoFeedTween?.stop();
    this.waveBannerText.destroy();
    this.waveTagText.destroy();
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

    const tooltipWidths = constrainTooltipWidths(this.viewportWidth, this.safeArea);
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
        this.safeArea,
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
    const inset = Math.min(6, height / 4);

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
    this.timeMetaText.setPosition(x, y + height * (8 / WATCH_RENDER_HEIGHT));
    const renderScale = Math.min(
      fitClockRenderScale(width),
      height / WATCH_RENDER_HEIGHT,
    );
    this.timeMetaText.setScale(renderScale);
    this.drawSegmentTime(
      x,
      y + height * (17 / WATCH_RENDER_HEIGHT),
      renderScale,
    );
  }

  private drawStatusBars(viewModel?: HudViewModel): void {
    if (!this.hudLayout) return;
    const { healthBar, staminaBar } = this.hudLayout;
    const drawFrame = (
      layout: HudLayout['healthBar'],
    ): void => {
      const radius = Math.min(5, layout.height / 2);
      this.statusBarGraphics
        .fillStyle(0x111513, 0.9)
        .fillRoundedRect(layout.x, layout.y, layout.width, layout.height, radius)
        .lineStyle(2, 0x3f4842, 1)
        .strokeRoundedRect(
          layout.x + 1,
          layout.y + 1,
          Math.max(0, layout.width - 2),
          Math.max(0, layout.height - 2),
          Math.max(0, radius - 1),
        );
    };
    const drawFill = (
      layout: HudLayout['healthBar'],
      ratio: number,
      color: number,
    ): void => {
      const radius = Math.min(5, layout.height / 2);
      const inset = Math.min(3, layout.height / 4);
      this.statusBarGraphics
        .fillStyle(color, 1)
        .fillRoundedRect(
          layout.x + inset,
          layout.y + inset,
          Math.max(0, (layout.width - inset * 2) * ratio),
          Math.max(0, layout.height - inset * 2),
          Math.max(0, radius - inset),
        );
    };

    this.statusBarGraphics.clear();
    drawFrame(healthBar);
    drawFill(
      healthBar,
      this.delayedHealth?.displayedRatio ?? viewModel?.healthRatio ?? 0,
      0xffb0a6,
    );
    drawFill(healthBar, viewModel?.healthRatio ?? 0, 0xd94747);
    drawFrame(staminaBar);
    drawFill(staminaBar, viewModel?.staminaRatio ?? 0, 0x42b96b);
    this.statusBarGraphics.setVisible(this.topHudVisible);
  }

  private fitAmmoText(): void {
    this.ammoText.setScale(1);
    if (this.ammoText.width === 0 || this.ammoText.height === 0) return;
    this.ammoText.setScale(Math.min(
      1,
      this.ammoMaxWidth === null ? 1 : this.ammoMaxWidth / this.ammoText.width,
      this.ammoMaxHeight === null ? 1 : this.ammoMaxHeight / this.ammoText.height,
    ));
  }

  private updateAmmoRounds(viewModel: HudViewModel): void {
    const previous = this.current;
    const sameWeapon = previous?.weaponId === viewModel.weaponId
      && previous.activeWeaponSlot === viewModel.activeWeaponSlot;
    const magazineChanged = previous?.magazineAmmo !== viewModel.magazineAmmo;
    const magazineSizeChanged = previous?.magazineSize !== viewModel.magazineSize;
    const reserveTextChanged = previous?.ammoText !== viewModel.ammoText;
    const firedRounds = countNewShots(previous?.shotSequence, viewModel.shotSequence);
    const ejectedRounds = ejectsCasingOnFire(viewModel.lastShotWeaponId)
      ? firedRounds
      : 0;
    const shotgunFired = retainsSpentShotgunShells(
      viewModel.weaponId,
      viewModel.lastShotWeaponId,
      firedRounds,
    );
    const texture = ammoTextureKey(viewModel.weaponId);

    if (previous?.weaponId !== viewModel.weaponId) {
      this.spentShotgunShells.forEach((round) => round.destroy());
      this.spentShotgunShells.length = 0;
      if (viewModel.weaponId === 'doubleBarrelShotgun') {
        while (
          this.spentShotgunShells.length
          < viewModel.spentCasings
        ) {
          this.spentShotgunShells.push(
            this.scene.add.image(0, 0, 'ammo-shotgun')
              .setDepth(101)
              .setScrollFactor(0)
              .setTint(0x5a4541)
              .setAlpha(0.58),
          );
        }
      }
    }

    if (!sameWeapon && firedRounds > 0) {
      const ejectedTexture = ammoTextureKey(viewModel.lastShotWeaponId);
      const ammoBeforeFiring = Math.min(
        viewModel.magazineSize,
        viewModel.magazineAmmo + firedRounds,
      );
      this.ammoRounds.forEach((round) => round.destroy());
      this.ammoRounds.length = 0;
      while (this.ammoRounds.length < ammoBeforeFiring) {
        this.ammoRounds.push(
          this.scene.add.image(0, 0, ejectedTexture)
            .setDepth(101)
            .setScrollFactor(0),
        );
      }
      this.layoutAmmoRounds(
        viewModel.magazineSize,
        false,
        ammoBeforeFiring,
        viewModel.ammoText,
      );
    }

    if (shotgunFired) {
      for (let index = 0; index < firedRounds; index += 1) {
        const shell = this.ammoRounds.pop();
        if (!shell) continue;
        shell.setTint(0x5a4541).setAlpha(0.58);
        this.spentShotgunShells.push(shell);
      }
    } else {
      for (let index = 0; index < ejectedRounds; index += 1) {
        const round = this.ammoRounds.pop();
        if (round) this.animateEjectedRound(round, index);
      }
    }

    if (
      viewModel.weaponId === 'doubleBarrelShotgun'
      && extractedSpentCasings(
        previous?.spentCasings,
        viewModel.spentCasings,
      )
    ) {
      const spent = this.spentShotgunShells.splice(0);
      spent.forEach((shell, index) => {
        shell.clearTint().setAlpha(1);
        this.animateEjectedRound(shell, index);
      });
    }

    if (!sameWeapon || ejectedRounds === 0) {
      while (this.ammoRounds.length > viewModel.magazineAmmo) {
        this.ammoRounds.pop()?.destroy();
      }
    }

    while (this.ammoRounds.length < viewModel.magazineAmmo) {
      this.ammoRounds.push(
        this.scene.add.image(0, 0, texture)
          .setDepth(101)
          .setScrollFactor(0),
      );
    }
    this.ammoRounds.forEach((round) => round.setTexture(texture));
    if (!sameWeapon || magazineChanged || magazineSizeChanged || reserveTextChanged) {
      this.layoutAmmoRounds(
        viewModel.magazineSize,
        ejectedRounds > 0,
        viewModel.magazineAmmo,
        viewModel.ammoText,
      );
    }
  }

  private layoutAmmoRounds(
    magazineSize = this.current?.magazineSize ?? 1,
    animateFeed = false,
    magazineAmmo = this.current?.magazineAmmo ?? this.ammoRounds.length,
    reserveText = this.current?.ammoText ?? this.ammoText.text,
  ): void {
    if (!this.hudLayout || magazineSize <= 0) return;
    const layout = createAmmoDisplayLayout(
      this.viewportWidth,
      this.viewportHeight,
      this.safeArea,
      this.hudLayout,
      magazineSize,
      this.mobileInputMode,
      this.mobileInteraction,
    );
    this.ammoMaxWidth = layout.reserve.maxWidth;
    this.ammoMaxHeight = layout.reserve.maxHeight;
    this.ammoText
      .setText(layout.compact
        ? `${magazineAmmo} / ${reserveText.replace(/^\+/, '')}`
        : reserveText)
      .setOrigin(layout.reserve.originX, layout.reserve.originY)
      .setPosition(layout.reserve.x, layout.reserve.y)
      .setVisible(this.topHudVisible);
    this.fitAmmoText();

    const visibleRoundCount = this.ammoRounds.length + this.spentShotgunShells.length;
    const targetYPositions = createAmmoRoundYPositions(
      layout.rounds.feedY,
      layout.rounds.step,
      visibleRoundCount,
    );
    const previousOffset = animateFeed && this.ammoRounds.length > 0
      ? Math.max(0, this.ammoRounds[0].y - (targetYPositions[0] ?? 0))
      : 0;
    this.ammoFeedTween?.stop();
    this.ammoFeedTween = undefined;
    this.ammoRounds.forEach((round, index) => {
      round
        .setDisplaySize(layout.rounds.width, layout.rounds.height)
        .setRotation(0)
        .setPosition(
          layout.rounds.x,
          (targetYPositions[index] ?? layout.rounds.feedY) + previousOffset,
        )
        .setVisible(this.topHudVisible && !layout.compact);
    });
    this.spentShotgunShells.forEach((shell, index) => {
      shell
        .setDisplaySize(layout.rounds.width, layout.rounds.height)
        .setRotation(0)
        .setPosition(
          layout.rounds.x,
          targetYPositions[this.ammoRounds.length + index] ?? layout.rounds.feedY,
        )
        .setVisible(this.topHudVisible && !layout.compact);
    });
    if (animateFeed && this.ammoRounds.length > 0 && previousOffset > 0) {
      const feedState = { offset: previousOffset };
      this.ammoFeedTween = this.scene.tweens.add({
        targets: feedState,
        offset: 0,
        duration: 85,
        ease: 'Back.Out',
        onUpdate: () => {
          this.ammoRounds.forEach((round, index) => {
            round.y = (targetYPositions[index] ?? layout.rounds.feedY)
              + feedState.offset;
          });
        },
        onComplete: () => {
          this.ammoFeedTween = undefined;
        },
      });
    }
  }

  private animateEjectedRound(round: Phaser.GameObjects.Image, order: number): void {
    const targetScaleX = round.scaleX * 0.65;
    const targetScaleY = round.scaleY * 0.65;
    const motion = createAmmoEjectionMotion(
      this.randomSource(),
      this.randomSource(),
      this.randomSource(),
    );
    const orderDelay = order * 20;
    this.scene.tweens.add({
      targets: round,
      x: round.x + motion.xDelta,
      y: round.y + motion.yDelta,
      angle: round.angle + motion.angleDelta,
      scaleX: targetScaleX,
      scaleY: targetScaleY,
      delay: orderDelay,
      duration: motion.durationMs,
      ease: 'Quad.Out',
    });
    this.scene.tweens.add({
      targets: round,
      alpha: 0,
      delay: orderDelay + motion.fadeDelayMs,
      duration: motion.durationMs - motion.fadeDelayMs,
      ease: 'Sine.In',
      onComplete: () => round.destroy(),
    });
  }

  private fitStatusText(): void {
    this.statusText.setScale(1);
    if (this.statusText.width === 0 || this.statusText.height === 0) return;
    this.statusText.setScale(Math.min(
      1,
      this.statusMaxWidth === null ? 1 : this.statusMaxWidth / this.statusText.width,
      this.statusMaxHeight === null ? 1 : this.statusMaxHeight / this.statusText.height,
    ));
  }

  private drawSegmentTime(centerX: number, top: number, scale: number): void {
    const digits = this.clockText.replace(':', '').padStart(4, '0').slice(-4);
    const digitWidth = 13 * scale;
    const digitGap = 3 * scale;
    const colonWidth = 6 * scale;
    const totalWidth = digitWidth * 4 + digitGap * 3 + colonWidth;
    let x = centerX - totalWidth / 2;

    for (let index = 0; index < digits.length; index += 1) {
      this.drawSegmentDigit(x, top, digits[index], scale);
      x += digitWidth;

      if (index === 1) {
        x += colonWidth / 2;
        this.timeGraphics.fillStyle(0x151a13, this.clockColonVisible ? 0.9 : 0.1);
        this.timeGraphics.fillCircle(x, top + 7 * scale, 1.3 * scale);
        this.timeGraphics.fillCircle(x, top + 15 * scale, 1.3 * scale);
        x += colonWidth / 2;
      }

      if (index < digits.length - 1) x += digitGap;
    }
  }

  private drawSegmentDigit(
    x: number,
    y: number,
    digit: string,
    scale: number,
  ): void {
    const active = new Set(segmentsForDigit(digit));

    for (const segment of SEVEN_SEGMENTS) {
      this.timeGraphics.fillStyle(0x151a13, active.has(segment) ? 0.92 : 0.1);
      this.drawSegment(x, y, segment, scale);
    }
  }

  private drawSegment(
    x: number,
    y: number,
    segment: SevenSegment,
    scale: number,
  ): void {
    const horizontal = {
      a: { x: x + 2 * scale, y, width: 9 * scale, height: 3 * scale },
      g: { x: x + 2 * scale, y: y + 10 * scale, width: 9 * scale, height: 3 * scale },
      d: { x: x + 2 * scale, y: y + 20 * scale, width: 9 * scale, height: 3 * scale },
    } as const;
    const vertical = {
      f: { x, y: y + 2 * scale, width: 3 * scale, height: 8 * scale },
      b: { x: x + 10 * scale, y: y + 2 * scale, width: 3 * scale, height: 8 * scale },
      e: { x, y: y + 12 * scale, width: 3 * scale, height: 8 * scale },
      c: { x: x + 10 * scale, y: y + 12 * scale, width: 3 * scale, height: 8 * scale },
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

  private positionWeaponSlots(
    slots: ReturnType<typeof createHudLayout>['weaponSlots'],
  ): void {
    this.weaponSlotLayout = slots;
    this.weaponIcons[0].setPosition(slots[0].x, slots[0].y);
    this.weaponIcons[1].setPosition(slots[1].x, slots[1].y);
    this.drawWeaponSlots(this.current);
  }

  private drawWeaponSlots(viewModel?: HudViewModel): void {
    if (!viewModel || !this.weaponSlotLayout) return;
    this.weaponSlotGraphics.clear();

    viewModel.weaponSlots.forEach((weapon, index) => {
      const icon = this.weaponIcons[index];
      const slot = this.weaponSlotLayout![index];
      const size = slot.width;
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
        const iconSize = size <= 44 ? size : Math.min(38, size - 8);
        icon
          .setTexture(
            weapon.id === 'pistol'
              ? 'weapon-pistol'
              : weapon.id === 'doubleBarrelShotgun'
                ? 'weapon-shotgun'
                : 'weapon-rifle',
          )
          .setDisplaySize(iconSize, iconSize)
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
