import Phaser from 'phaser';

import {
  decayTransientLight,
  dampValue,
  renderableDarknessAlpha,
  resolveFlashlightEnabled,
  type TimeBasedLightingConfig,
} from '../logic/timeBasedLighting';

const LIGHTING_DEPTH = 80;
const AMBIENT_TEXTURE_KEY = 'time-based-lighting-ambient';
const FLASHLIGHT_TEXTURE_KEY = 'time-based-lighting-flashlight';
const MUZZLE_FLASH_TEXTURE_KEY = 'muzzle-flash-directional-light';
const MUZZLE_FLASH_VARIANTS = [
  { lengthScale: 0.88, widthScale: 1.12 },
  { lengthScale: 1.08, widthScale: 0.86 },
  { lengthScale: 1, widthScale: 1 },
] as const;

export class TimeBasedLighting {
  private readonly darkness: Phaser.GameObjects.Rectangle;
  private readonly ambientMaskSource: Phaser.GameObjects.Image;
  private readonly flashlightMaskSource: Phaser.GameObjects.Image;
  private readonly muzzleFlashCoreMaskSource: Phaser.GameObjects.Image;
  private readonly muzzleFlashForwardMaskSource: Phaser.GameObjects.Image;
  private readonly lightMaskSource: Phaser.GameObjects.Container;
  private readonly ambientMask: Phaser.Display.Masks.BitmapMask | null;
  private flashlightEnabled = false;
  private flashlightIntensity = 0;
  private visualDarknessAlpha: number | null = null;
  private muzzleFlashIntensity = 0;
  private muzzleFlashSequence = 0;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly config: TimeBasedLightingConfig,
  ) {
    this.createAmbientTexture();
    this.createFlashlightTexture();
    this.createMuzzleFlashTexture();
    this.darkness = scene.add.rectangle(0, 0, 1, 1, 0x05070b, 1)
      .setOrigin(0)
      .setScrollFactor(0)
      .setDepth(LIGHTING_DEPTH);
    this.ambientMaskSource = scene.make.image({
      x: 0,
      y: 0,
      key: AMBIENT_TEXTURE_KEY,
      add: false,
    }).setScrollFactor(0).setDisplaySize(
      config.ambientLightRadius * 2,
      config.ambientLightRadius * 2,
    );
    this.flashlightMaskSource = scene.make.image({
      x: 0,
      y: 0,
      key: FLASHLIGHT_TEXTURE_KEY,
      add: false,
    }).setOrigin(0, 0.5).setScrollFactor(0);
    this.muzzleFlashCoreMaskSource = scene.make.image({
      x: 0,
      y: 0,
      key: AMBIENT_TEXTURE_KEY,
      add: false,
    }).setScrollFactor(0).setDisplaySize(
      config.muzzleFlashCoreRadius * 2,
      config.muzzleFlashCoreRadius * 2,
    ).setVisible(false);
    this.muzzleFlashForwardMaskSource = scene.make.image({
      x: 0,
      y: 0,
      key: MUZZLE_FLASH_TEXTURE_KEY,
      add: false,
    }).setOrigin(0, 0.5).setScrollFactor(0).setVisible(false);
    this.lightMaskSource = scene.make.container({
      x: 0,
      y: 0,
      add: false,
    }).setScrollFactor(0);
    this.lightMaskSource.add([
      this.ambientMaskSource,
      this.flashlightMaskSource,
      this.muzzleFlashCoreMaskSource,
      this.muzzleFlashForwardMaskSource,
    ]);

    if (scene.game.renderer.type === Phaser.WEBGL) {
      this.ambientMask = this.darkness.createBitmapMask(this.lightMaskSource);
      this.ambientMask.invertAlpha = true;
      this.darkness.setMask(this.ambientMask);
    } else {
      this.ambientMask = null;
      this.darkness.setVisible(false);
    }
  }

  resize(width: number, height: number): void {
    this.darkness.setSize(Math.max(0, width), Math.max(0, height));
  }

  update(
    darknessAlpha: number,
    playerScreenX: number,
    playerScreenY: number,
    aimDirection: { x: number; y: number },
    deltaMs = 0,
  ): void {
    const targetDarknessAlpha = renderableDarknessAlpha(
      darknessAlpha,
      this.ambientMask !== null,
    );
    this.visualDarknessAlpha = this.visualDarknessAlpha === null
      ? targetDarknessAlpha
      : dampValue(
        this.visualDarknessAlpha,
        targetDarknessAlpha,
        deltaMs,
        this.config.darknessResponseRate,
      );
    this.darkness.setAlpha(this.visualDarknessAlpha);
    this.ambientMaskSource.setPosition(playerScreenX, playerScreenY);
    this.flashlightMaskSource.setPosition(playerScreenX, playerScreenY);
    this.flashlightEnabled = resolveFlashlightEnabled(
      this.flashlightEnabled,
      targetDarknessAlpha,
      this.config.flashlightOnDarknessAlpha,
      this.config.flashlightOffDarknessAlpha,
    );
    this.flashlightIntensity = dampValue(
      this.flashlightIntensity,
      this.flashlightEnabled ? 1 : 0,
      deltaMs,
      this.flashlightEnabled
        ? this.config.flashlightFadeInResponseRate
        : this.config.flashlightFadeOutResponseRate,
    );
    this.flashlightMaskSource
      .setAlpha(this.flashlightIntensity)
      .setVisible(this.flashlightIntensity > 0.001);
    this.muzzleFlashIntensity = decayTransientLight(
      this.muzzleFlashIntensity,
      deltaMs,
      this.config.muzzleFlashDecayRate,
    );
    this.muzzleFlashCoreMaskSource
      .setAlpha(this.muzzleFlashIntensity)
      .setVisible(this.muzzleFlashIntensity > 0.001);
    this.muzzleFlashForwardMaskSource
      .setAlpha(this.muzzleFlashIntensity)
      .setVisible(this.muzzleFlashIntensity > 0.001);

    if (Math.hypot(aimDirection.x, aimDirection.y) > 1e-6) {
      this.flashlightMaskSource.setRotation(Math.atan2(aimDirection.y, aimDirection.x));
    }
  }

  triggerMuzzleFlash(
    screenX: number,
    screenY: number,
    direction: { x: number; y: number },
    maximumDistance = this.config.muzzleFlashForwardLength,
  ): void {
    if (this.ambientMask === null) return;

    const variant = MUZZLE_FLASH_VARIANTS[
      this.muzzleFlashSequence % MUZZLE_FLASH_VARIANTS.length
    ];
    this.muzzleFlashSequence += 1;
    this.muzzleFlashIntensity = 1;
    this.muzzleFlashCoreMaskSource
      .setPosition(screenX, screenY)
      .setAlpha(1)
      .setVisible(true);
    this.muzzleFlashForwardMaskSource
      .setPosition(screenX, screenY)
      .setDisplaySize(
        Math.min(
          this.config.muzzleFlashForwardLength * variant.lengthScale,
          Math.max(1, maximumDistance),
        ),
        this.config.muzzleFlashForwardWidth * variant.widthScale,
      )
      .setAlpha(1)
      .setVisible(true);

    if (Math.hypot(direction.x, direction.y) > 1e-6) {
      this.muzzleFlashForwardMaskSource.setRotation(Math.atan2(direction.y, direction.x));
    }
  }

  destroy(): void {
    this.darkness.clearMask(false);
    this.ambientMask?.destroy();
    this.lightMaskSource.destroy(true);
    this.darkness.destroy();
    this.scene.textures.remove(AMBIENT_TEXTURE_KEY);
    this.scene.textures.remove(FLASHLIGHT_TEXTURE_KEY);
    this.scene.textures.remove(MUZZLE_FLASH_TEXTURE_KEY);
  }

  private createAmbientTexture(): void {
    if (this.scene.textures.exists(AMBIENT_TEXTURE_KEY)) return;

    const size = Math.max(2, Math.round(this.config.ambientTextureSize));
    const texture = this.scene.textures.createCanvas(AMBIENT_TEXTURE_KEY, size, size);

    if (!texture) return;

    const center = size / 2;
    const context = texture.context;
    const gradient = context.createRadialGradient(center, center, 0, center, center, center);
    gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
    gradient.addColorStop(0.45, 'rgba(255, 255, 255, 0.92)');
    gradient.addColorStop(0.75, 'rgba(255, 255, 255, 0.38)');
    gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
    context.fillStyle = gradient;
    context.fillRect(0, 0, size, size);
    texture.refresh();
  }

  private createFlashlightTexture(): void {
    if (this.scene.textures.exists(FLASHLIGHT_TEXTURE_KEY)) return;

    const length = Math.max(2, Math.round(this.config.flashlightLength));
    const maximumHalfWidth = Math.max(
      this.config.flashlightStartWidth / 2,
      Math.tan(this.config.flashlightAngleRadians / 2) * length,
    );
    const height = Math.max(2, Math.ceil(maximumHalfWidth * 2));
    const texture = this.scene.textures.createCanvas(FLASHLIGHT_TEXTURE_KEY, length, height);

    if (!texture) return;

    const context = texture.context;
    const image = context.createImageData(length, height);
    const centerY = height / 2;
    const startHalfWidth = Math.max(1, this.config.flashlightStartWidth / 2);
    const edgeSoftness = Math.min(1, Math.max(0.01, this.config.flashlightEdgeSoftness));
    const centerIntensity = Math.min(1, Math.max(0, this.config.flashlightCenterIntensity));
    const distanceFalloff = Math.max(0.01, this.config.flashlightDistanceFalloff);

    for (let x = 0; x < length; x += 1) {
      const distanceProgress = x / Math.max(1, length - 1);
      const halfWidth = startHalfWidth
        + (maximumHalfWidth - startHalfWidth) * distanceProgress;
      const distanceAlpha = Math.pow(1 - distanceProgress, distanceFalloff);

      for (let y = 0; y < height; y += 1) {
        const lateralProgress = Math.abs(y - centerY) / halfWidth;

        if (lateralProgress >= 1) continue;

        const edgeProgress = Math.max(
          0,
          (lateralProgress - (1 - edgeSoftness)) / edgeSoftness,
        );
        const edgeAlpha = 1 - smoothstep(edgeProgress);
        const alpha = centerIntensity * distanceAlpha * edgeAlpha;
        const pixel = (y * length + x) * 4;
        image.data[pixel] = 255;
        image.data[pixel + 1] = 255;
        image.data[pixel + 2] = 255;
        image.data[pixel + 3] = Math.round(alpha * 255);
      }
    }

    context.putImageData(image, 0, 0);
    texture.refresh();
  }

  private createMuzzleFlashTexture(): void {
    if (this.scene.textures.exists(MUZZLE_FLASH_TEXTURE_KEY)) return;

    const length = Math.max(2, Math.round(this.config.muzzleFlashForwardLength));
    const height = Math.max(2, Math.round(this.config.muzzleFlashForwardWidth));
    const texture = this.scene.textures.createCanvas(MUZZLE_FLASH_TEXTURE_KEY, length, height);

    if (!texture) return;

    const context = texture.context;
    const image = context.createImageData(length, height);
    const centerY = height / 2;

    for (let x = 0; x < length; x += 1) {
      const distanceProgress = x / Math.max(1, length - 1);
      const shape = Math.pow(Math.sin(Math.PI * distanceProgress), 0.65);
      const halfWidth = Math.max(1, centerY * shape);
      const distanceAlpha = Math.pow(1 - distanceProgress, 0.65);

      for (let y = 0; y < height; y += 1) {
        const lateralProgress = Math.abs(y - centerY) / halfWidth;

        if (lateralProgress >= 1) continue;

        const edgeAlpha = 1 - smoothstep(lateralProgress);
        const alpha = distanceAlpha * edgeAlpha;
        const pixel = (y * length + x) * 4;
        image.data[pixel] = 255;
        image.data[pixel + 1] = 255;
        image.data[pixel + 2] = 255;
        image.data[pixel + 3] = Math.round(alpha * 255);
      }
    }

    context.putImageData(image, 0, 0);
    texture.refresh();
  }
}

function smoothstep(value: number): number {
  const normalized = Math.min(1, Math.max(0, value));
  return normalized * normalized * (3 - 2 * normalized);
}
