import Phaser from 'phaser';

import {
  CHARACTER_CLASS_OPTIONS,
  DEFAULT_GAME_SETTINGS,
  GAME_REGISTRY_KEYS,
  type CharacterClassOption,
  type CharacterClassId,
} from '../config/menuConfig';
import {
  clampClassStatusY,
  createMenuActionLayout,
  selectCharacterClass,
  toggleSound,
} from '../logic/menu';
import { syncSoundEnabled } from '../effects/audioSettings';

type MenuView = 'main' | 'settings' | 'classSelect';

const COLORS = {
  background: 0x11161c,
  panel: 0x1b252e,
  panelSelected: 0x29475b,
  malePanel: 0x123f70,
  malePanelSelected: 0x176bb2,
  femalePanel: 0x8e2355,
  femalePanelSelected: 0xe12c80,
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
  private portraitLoadStarted = false;
  private portraitLoadFinished = false;
  private gameStartPending = false;
  private resizeObserver?: ResizeObserver;
  private resizeFrame?: number;

  constructor() {
    super('MainMenuScene');
  }

  create(): void {
    document.getElementById('boot-loading')?.remove();
    const debugUrl = new URL(window.location.href);
    if (debugUrl.searchParams.has('zombieAppearanceDebug')) {
      void this.startZombieAppearanceDebug(debugUrl);
      return;
    }
    if (debugUrl.searchParams.has('playerAppearanceDebug')) {
      void this.startAppearanceDebug(debugUrl);
      return;
    }

    if (!this.registry.has(GAME_REGISTRY_KEYS.soundEnabled)) {
      this.registry.set(
        GAME_REGISTRY_KEYS.soundEnabled,
        DEFAULT_GAME_SETTINGS.soundEnabled,
      );
    }
    syncSoundEnabled(
      this.sound,
      this.registry.get(GAME_REGISTRY_KEYS.soundEnabled) !== false,
    );

    this.scale.on(
      Phaser.Scale.Events.RESIZE,
      this.scheduleResponsiveRender,
      this,
    );
    const parent = this.game.canvas.parentElement;
    if (parent) {
      this.resizeObserver = new ResizeObserver(
        () => this.scheduleResponsiveRender(),
      );
      this.resizeObserver.observe(parent);
    }
    window.visualViewport?.addEventListener(
      'resize',
      this.scheduleResponsiveRender,
    );
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.scale.off(
        Phaser.Scale.Events.RESIZE,
        this.scheduleResponsiveRender,
        this,
      );
      this.resizeObserver?.disconnect();
      this.resizeObserver = undefined;
      window.visualViewport?.removeEventListener(
        'resize',
        this.scheduleResponsiveRender,
      );
      if (this.resizeFrame !== undefined) {
        cancelAnimationFrame(this.resizeFrame);
        this.resizeFrame = undefined;
      }
      this.ui?.destroy(true);
      this.ui = undefined;
    });
    this.render();
  }

  private scheduleResponsiveRender = (): void => {
    if (this.resizeFrame !== undefined) cancelAnimationFrame(this.resizeFrame);
    this.resizeFrame = requestAnimationFrame(() => {
      this.resizeFrame = undefined;
      const parent = this.game.canvas.parentElement;
      if (!parent) {
        this.render();
        return;
      }
      const width = Math.max(1, parent.clientWidth);
      const height = Math.max(1, parent.clientHeight);
      if (this.scale.width !== width || this.scale.height !== height) {
        this.scale.resize(width, height);
        return;
      }
      this.render();
    });
  };

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
      this.startPortraitLoading();
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
        syncSoundEnabled(this.sound, next.soundEnabled);
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
    this.addText(
      centerX,
      top + 56,
      this.portraitLoadStarted && !this.portraitLoadFinished
        ? 'LOADING SURVIVORS...'
        : 'CHOOSE YOUR SURVIVOR',
      13,
      false,
      COLORS.muted,
    );

    const stageTop = top + 88;
    const actionY = bottom - 26;
    const actionLayout = createMenuActionLayout(left, right);
    const stageBottom = actionY - 42;
    const stageWidth = isMobileLayout ? width : Math.min(930, width * 0.82);
    const stageHeight = Math.max(
      1,
      Math.min(isMobileLayout ? 620 : 610, stageBottom - stageTop),
    );
    this.addClassStage(
      centerX,
      stageTop + (stageBottom - stageTop) / 2,
      stageWidth,
      stageHeight,
      isMobileLayout,
      actionY,
      !this.gameStartPending,
    );

    this.addButton(actionLayout.back.x, actionY, 'BACK', () => {
      this.view = 'main';
      this.render();
    }, actionLayout.back.width, !this.gameStartPending);
    this.addButton(
      actionLayout.deploy.x,
      actionY,
      this.gameStartPending ? 'LOADING...' : 'DEPLOY',
      () => this.startGame(),
      actionLayout.deploy.width,
      this.selectedClassId !== null && !this.gameStartPending,
    );
  }

  private addClassStage(
    x: number,
    y: number,
    width: number,
    height: number,
    isMobileLayout: boolean,
    actionY: number,
    interactive: boolean,
  ): void {
    const left = x - width / 2;
    const right = x + width / 2;
    const top = y - height / 2;
    const bottom = y + height / 2;
    const diagonalTop = x + width * (isMobileLayout ? 0.27 : 0.11);
    const diagonalBottom = x - width * (isMobileLayout ? 0.25 : 0.12);
    const maleSelected = this.selectedClassId === 'male-survivor';
    const femaleSelected = this.selectedClassId === 'female-survivor';
    const malePoints = [left, top, diagonalTop, top, diagonalBottom, bottom, left, bottom];
    const femalePoints = [diagonalTop, top, right, top, right, bottom, diagonalBottom, bottom];

    const panels = this.add.graphics();
    panels.fillStyle(maleSelected ? COLORS.malePanelSelected : COLORS.malePanel);
    panels.fillPoints([
      new Phaser.Geom.Point(left, top),
      new Phaser.Geom.Point(diagonalTop, top),
      new Phaser.Geom.Point(diagonalBottom, bottom),
      new Phaser.Geom.Point(left, bottom),
    ], true);
    panels.fillStyle(femaleSelected ? COLORS.femalePanelSelected : COLORS.femalePanel);
    panels.fillPoints([
      new Phaser.Geom.Point(diagonalTop, top),
      new Phaser.Geom.Point(right, top),
      new Phaser.Geom.Point(right, bottom),
      new Phaser.Geom.Point(diagonalBottom, bottom),
    ], true);
    this.ui?.add(panels);

    const chrome = this.add.graphics();
    chrome.lineStyle(4, 0x55bfff, maleSelected ? 1 : 0.55);
    chrome.beginPath();
    chrome.moveTo(left, top);
    chrome.lineTo(diagonalTop, top);
    chrome.moveTo(left, top);
    chrome.lineTo(left, top + height * 0.12);
    chrome.strokePath();
    chrome.lineStyle(4, 0xff74b6, femaleSelected ? 1 : 0.55);
    chrome.beginPath();
    chrome.moveTo(diagonalTop, top);
    chrome.lineTo(right, top);
    chrome.moveTo(right, bottom - height * 0.12);
    chrome.lineTo(right, bottom);
    chrome.lineTo(diagonalBottom, bottom);
    chrome.strokePath();
    this.ui?.add(chrome);

    CHARACTER_CLASS_OPTIONS.forEach((option, index) => {
      const points = index === 0 ? malePoints : femalePoints;
      const polygon = new Phaser.Geom.Polygon(points.map((coordinate, pointIndex) => (
        coordinate - (pointIndex % 2 === 0 ? left : top)
      )));
      const hitArea = this.add.zone(left, top, width, height)
        .setOrigin(0);
      if (interactive) {
        hitArea
          .setInteractive(polygon, Phaser.Geom.Polygon.Contains)
          .on('pointerup', () => {
          this.selectedClassId = selectCharacterClass(this.selectedClassId, option.id);
          this.render();
        });
        hitArea.input!.cursor = 'pointer';
      }
      this.ui?.add(hitArea);
      this.addStagePortrait(
        option,
        index,
        x,
        y,
        width,
        height,
        isMobileLayout,
        actionY,
      );
    });

    const divider = this.add.graphics();
    divider.lineStyle(
      isMobileLayout ? 2 : 1,
      isMobileLayout ? 0x10141b : 0xe8f3fa,
      isMobileLayout ? 0.72 : 0.34,
    );
    divider.beginPath();
    divider.moveTo(diagonalTop, top);
    divider.lineTo(diagonalBottom, bottom);
    divider.strokePath();
    this.ui?.add(divider);
  }

  private addStagePortrait(
    option: CharacterClassOption,
    index: number,
    x: number,
    y: number,
    width: number,
    height: number,
    isMobileLayout: boolean,
    actionY: number,
  ): void {
    const selected = this.selectedClassId === option.id;
    const direction = index === 0 ? -1 : 1;
    const portraitX = x + direction * width * (isMobileLayout ? 0.24 : 0.18);
    const portraitY = y + height * (isMobileLayout
      ? (index === 0 ? -0.18 : 0.1)
      : (index === 0 ? -0.04 : 0.09));
    const portraitHeight = height * (isMobileLayout
      ? (index === 0 ? 0.64 : 0.66)
      : (index === 0 ? 0.82 : 0.85));
    const portraitWidth = width * (isMobileLayout ? 0.62 : 0.45);
    let portrait: Phaser.GameObjects.Image | undefined;

    if (option.portraitUrl && this.textures.exists(option.portraitTextureKey)) {
      portrait = this.add.image(portraitX, portraitY, option.portraitTextureKey);
      portrait.setCrop(
        option.portraitCrop.x,
        option.portraitCrop.y,
        option.portraitCrop.width,
        option.portraitCrop.height,
      );
      portrait.setScale(Math.min(
        portraitWidth / option.portraitCrop.width,
        portraitHeight / option.portraitCrop.height,
      ) * (selected ? 1.06 : 1));
      if (this.selectedClassId !== null && !selected) {
        portrait.setAlpha(0.62);
      }
      this.ui?.add(portrait);
    } else {
      const silhouette = this.add.graphics();
      silhouette.fillStyle(0x71808a, 0.75);
      silhouette.fillCircle(portraitX, portraitY - portraitHeight * 0.24, 20);
      silhouette.fillRoundedRect(
        portraitX - 36,
        portraitY - portraitHeight * 0.12,
        72,
        portraitHeight * 0.46,
        12,
      );
      this.ui?.add(silhouette);
    }

    if (selected && portrait) {
      this.tweens.add({
        targets: portrait,
        y: portrait.y - 6,
        duration: 180,
        ease: 'Back.Out',
      });
    }
    const nameX = isMobileLayout
      ? x + direction * width * 0.26
      : x + direction * width * 0.31;
    const nameY = y + height * (isMobileLayout
      ? (index === 0 ? 0.16 : 0.41)
      : (index === 0 ? 0.39 : -0.39));
    const name = this.addText(
      nameX,
      nameY,
      option.name,
      Math.min(isMobileLayout ? 22 : 52, Math.max(16, width * 0.055)),
      true,
    );
    name
      .setStroke('#0b1118', isMobileLayout ? 3 : 2)
      .setShadow(0, 2, '#000000', 4, true, true);
    const role = this.addText(
      nameX,
      nameY + (isMobileLayout ? 25 : 30),
      `${index === 0 ? '01' : '02'} // ${option.roleLabel}`,
      isMobileLayout ? 10 : 12,
      false,
      COLORS.muted,
    );
    role.setShadow(0, 1, '#000000', 3, true, true);
    if (this.selectedClassId !== null && !selected) {
      name.setAlpha(0.55);
      role.setAlpha(0.55);
    }
    if (selected) {
      const preferredStatusY = nameY + (isMobileLayout ? 47 : -34);
      this.addText(
        nameX,
        isMobileLayout
          ? clampClassStatusY(preferredStatusY, nameY, actionY)
          : preferredStatusY,
        'READY',
        11,
        true,
        index === 0 ? '#76caff' : '#ff9ac9',
      );
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

  private startPortraitLoading(): void {
    if (this.portraitLoadStarted) return;

    const unloadedOptions = CHARACTER_CLASS_OPTIONS.filter((option) => (
      option.portraitUrl
      && !this.textures.exists(option.portraitTextureKey)
    ));
    if (unloadedOptions.length === 0) {
      this.portraitLoadStarted = true;
      this.portraitLoadFinished = true;
      return;
    }

    this.portraitLoadStarted = true;
    for (const option of unloadedOptions) {
      this.load.image(option.portraitTextureKey, option.portraitUrl!);
    }
    this.load.once(Phaser.Loader.Events.COMPLETE, () => {
      this.portraitLoadFinished = true;
      if (this.scene.isActive()) this.render();
    });
    this.load.start();
  }

  private async startAppearanceDebug(debugUrl: URL): Promise<void> {
    debugUrl.searchParams.delete('playerAppearanceDebug');
    window.history.replaceState({}, '', debugUrl);
    const { PlayerAppearanceDebugScene } = await import(
      './PlayerAppearanceDebugScene'
    );
    if (!this.scene.manager.keys.PlayerAppearanceDebugScene) {
      this.scene.add(
        'PlayerAppearanceDebugScene',
        PlayerAppearanceDebugScene,
        false,
      );
    }
    this.scene.start('PlayerAppearanceDebugScene');
  }

  private async startZombieAppearanceDebug(debugUrl: URL): Promise<void> {
    debugUrl.searchParams.delete('zombieAppearanceDebug');
    window.history.replaceState({}, '', debugUrl);
    const { ZombieAppearanceDebugScene } = await import(
      './ZombieAppearanceDebugScene'
    );
    if (!this.scene.manager.keys.ZombieAppearanceDebugScene) {
      this.scene.add(
        'ZombieAppearanceDebugScene',
        ZombieAppearanceDebugScene,
        false,
      );
    }
    this.scene.start('ZombieAppearanceDebugScene');
  }

  private async startGame(): Promise<void> {
    if (this.selectedClassId === null || this.gameStartPending) return;
    const requestedClassId = this.selectedClassId;
    this.gameStartPending = true;
    this.render();
    try {
      if (!this.scene.manager.keys.GameScene) {
        const { GameScene } = await import('./GameScene');
        this.scene.add('GameScene', GameScene, false);
      }
      if (
        !this.scene.isActive()
        || this.view !== 'classSelect'
        || this.selectedClassId !== requestedClassId
      ) {
        this.gameStartPending = false;
        if (this.scene.isActive()) this.render();
        return;
      }
      this.registry.set(GAME_REGISTRY_KEYS.characterClassId, requestedClassId);
      this.scene.start('GameScene');
    } catch (error) {
      this.gameStartPending = false;
      if (this.scene.isActive()) this.render();
      console.error('Failed to load the game scene.', error);
    }
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
