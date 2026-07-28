import Phaser from 'phaser';

import { WORLD_RENDER_DEPTH } from '../config/renderDepth';
import {
  resolveSupplyDropIndicator,
  type SupplyDropSnapshot,
} from '../logic/supplyDrop';

const INDICATOR_DEPTH = 180;

export class SupplyDropVisual {
  private readonly planeShadow: Phaser.GameObjects.Graphics;
  private readonly crateShadow: Phaser.GameObjects.Graphics;
  private readonly parachute: Phaser.GameObjects.Graphics;
  private readonly crate: Phaser.GameObjects.Graphics;
  private readonly smoke: Phaser.GameObjects.Graphics;
  private readonly planeIndicatorBubble: Phaser.GameObjects.Graphics;
  private readonly planeIndicatorIcon: Phaser.GameObjects.Graphics;
  private readonly crateIndicator: Phaser.GameObjects.Graphics;
  private drawnCrateOpened = false;

  constructor(scene: Phaser.Scene) {
    this.planeShadow = scene.add.graphics()
      .setDepth(WORLD_RENDER_DEPTH.aircraftShadow)
      .setScale(1.3)
      .setVisible(false);
    this.crateShadow = scene.add.graphics()
      .setDepth(WORLD_RENDER_DEPTH.supplyDrop)
      .setVisible(false);
    this.parachute = scene.add.graphics()
      .setDepth(WORLD_RENDER_DEPTH.supplyDrop + 1)
      .setVisible(false);
    this.crate = scene.add.graphics()
      .setDepth(WORLD_RENDER_DEPTH.supplyDrop + 1)
      .setVisible(false);
    this.smoke = scene.add.graphics()
      .setDepth(WORLD_RENDER_DEPTH.supplySmoke)
      .setVisible(false);
    this.planeIndicatorBubble = scene.add.graphics()
      .setDepth(INDICATOR_DEPTH)
      .setScrollFactor(0)
      .setVisible(false);
    this.planeIndicatorIcon = scene.add.graphics()
      .setDepth(INDICATOR_DEPTH + 1)
      .setScrollFactor(0)
      .setVisible(false);
    this.crateIndicator = scene.add.graphics()
      .setDepth(INDICATOR_DEPTH)
      .setScrollFactor(0)
      .setVisible(false);

    this.drawPlaneShadow();
    this.drawParachute();
    this.drawCrate();
    this.drawPlaneIndicator();
    this.drawCrateIndicator();
  }

  update(
    snapshot: SupplyDropSnapshot,
    planeScreen: { x: number; y: number },
    targetScreen: { x: number; y: number },
    viewport: { width: number; height: number },
    indicatorMargin: number,
  ): void {
    this.planeShadow
      .setVisible(snapshot.planeVisible)
      .setPosition(snapshot.planePosition.x, snapshot.planePosition.y)
      .setRotation(snapshot.planeRotation);

    const crateVisible = !snapshot.crateOpened && (
      snapshot.phase === 'falling'
      || snapshot.phase === 'landed'
    );
    if (snapshot.crateOpened !== this.drawnCrateOpened) {
      this.drawCrate(snapshot.crateOpened);
      this.drawnCrateOpened = snapshot.crateOpened;
    }
    const shadowScale = snapshot.phase === 'landed'
      ? 1
      : 0.45 + snapshot.fallProgress * 0.55;
    this.crateShadow
      .setVisible(crateVisible)
      .setPosition(snapshot.target.x, snapshot.target.y)
      .setScale(shadowScale);
    this.crate
      .setVisible(crateVisible)
      .setPosition(snapshot.cratePosition.x, snapshot.cratePosition.y)
      .setScale(1.65 - snapshot.fallProgress * 0.65);
    this.parachute
      .setVisible(!snapshot.crateDestroyed && snapshot.phase === 'falling')
      .setPosition(snapshot.cratePosition.x, snapshot.cratePosition.y)
      .setScale(1.65 - snapshot.fallProgress * 0.65);

    this.drawSmoke(snapshot);

    const planeIndicator = resolveSupplyDropIndicator(
      planeScreen,
      viewport,
      indicatorMargin,
    );
    const showPlaneIndicator = (
      snapshot.phase === 'announced'
      || snapshot.planeVisible
    );
    const planeMarkerVisible = showPlaneIndicator && planeIndicator.visible;
    this.planeIndicatorBubble
      .setVisible(planeMarkerVisible)
      .setPosition(planeIndicator.position.x, planeIndicator.position.y)
      .setRotation(planeIndicator.rotation);
    this.planeIndicatorIcon
      .setVisible(planeMarkerVisible)
      .setPosition(planeIndicator.position.x, planeIndicator.position.y)
      .setRotation(0);

    const crateIndicator = resolveSupplyDropIndicator(
      targetScreen,
      viewport,
      indicatorMargin,
    );
    const showCrateIndicator = (
      !snapshot.crateDestroyed
      && !snapshot.crateOpened
      && (snapshot.phase === 'falling' || snapshot.phase === 'landed')
    );
    this.crateIndicator
      .setVisible(showCrateIndicator && crateIndicator.visible)
      .setPosition(crateIndicator.position.x, crateIndicator.position.y)
      .setRotation(crateIndicator.rotation);
  }

  destroy(): void {
    this.planeShadow.destroy();
    this.crateShadow.destroy();
    this.parachute.destroy();
    this.crate.destroy();
    this.smoke.destroy();
    this.planeIndicatorBubble.destroy();
    this.planeIndicatorIcon.destroy();
    this.crateIndicator.destroy();
  }

  private drawPlaneShadow(): void {
    this.planeShadow
      // One continuous polygon keeps the shadow density uniform throughout.
      .fillStyle(0x050608, 0.23)
      .fillPoints([
        new Phaser.Geom.Point(68, 0),
        new Phaser.Geom.Point(58, -12),
        new Phaser.Geom.Point(24, -14),
        new Phaser.Geom.Point(18, -88),
        new Phaser.Geom.Point(-2, -91),
        new Phaser.Geom.Point(-13, -14),
        new Phaser.Geom.Point(-37, -13),
        new Phaser.Geom.Point(-44, -37),
        new Phaser.Geom.Point(-58, -40),
        new Phaser.Geom.Point(-63, -14),
        new Phaser.Geom.Point(-72, -9),
        new Phaser.Geom.Point(-75, 0),
        new Phaser.Geom.Point(-72, 9),
        new Phaser.Geom.Point(-63, 14),
        new Phaser.Geom.Point(-58, 40),
        new Phaser.Geom.Point(-44, 37),
        new Phaser.Geom.Point(-37, 13),
        new Phaser.Geom.Point(-13, 14),
        new Phaser.Geom.Point(-2, 91),
        new Phaser.Geom.Point(18, 88),
        new Phaser.Geom.Point(24, 14),
        new Phaser.Geom.Point(58, 12),
      ], true);
  }

  private drawCrate(opened = false): void {
    this.crateShadow
      .clear()
      .fillStyle(0x000000, 0.28)
      .fillEllipse(4, 8, 58, 31);

    this.crate.clear();
    if (opened) {
      this.crate
        // Open lid rests behind the dark cargo cavity.
        .fillStyle(0x18211e, 1)
        .fillRoundedRect(-24, -39, 48, 22, 4)
        .fillStyle(0x69736f, 1)
        .fillRoundedRect(-21, -36, 42, 16, 2)
        .fillStyle(0x343f3b, 1)
        .fillRect(-12, -36, 5, 16)
        .fillRect(8, -36, 5, 16)
        .fillStyle(0x18211e, 1)
        .fillRoundedRect(-26, -21, 52, 42, 5)
        .fillStyle(0x46534e, 1)
        .fillRoundedRect(-23, -18, 46, 36, 3)
        .fillStyle(0x0b100e, 1)
        .fillRoundedRect(-20, -15, 40, 26, 3)
        .lineStyle(2, 0x89908a, 0.75)
        .strokeRoundedRect(-20, -15, 40, 26, 3)
        .fillStyle(0x9da39d, 1)
        .fillRoundedRect(-17, 11, 5, 5, 1)
        .fillRoundedRect(-2, 11, 5, 5, 1)
        .fillRoundedRect(13, 11, 5, 5, 1);
      return;
    }

    this.crate
      // Low, wide military hard case inspired by the EFT airdrop crate.
      .fillStyle(0x18211e, 1)
      .fillRoundedRect(-26, -21, 52, 42, 5)
      .fillStyle(0x46534e, 1)
      .fillRoundedRect(-23, -18, 46, 36, 3)
      // Lighter lid with recessed panels.
      .fillStyle(0x69736f, 1)
      .fillRoundedRect(-21, -16, 42, 25, 2)
      .lineStyle(1, 0x303b37, 0.85)
      .strokeRoundedRect(-21, -16, 42, 25, 2)
      .lineBetween(-20, -5, 20, -5)
      // Crossed securing bands.
      .fillStyle(0x343f3b, 1)
      .fillRect(-12, -18, 5, 36)
      .fillRect(8, -18, 5, 36)
      .fillRect(-23, 1, 46, 5)
      .lineStyle(1, 0x8a928c, 0.75)
      .lineBetween(-10, -17, -10, 17)
      .lineBetween(10, -17, 10, 17)
      // Dark front face and three metal latches.
      .fillStyle(0x28332f, 1)
      .fillRect(-23, 10, 46, 8)
      .fillStyle(0x9da39d, 1)
      .fillRoundedRect(-17, 10, 5, 6, 1)
      .fillRoundedRect(-2, 10, 5, 6, 1)
      .fillRoundedRect(13, 10, 5, 6, 1)
      .fillStyle(0x4b5550, 1)
      .fillRect(-16, 12, 3, 2)
      .fillRect(-1, 12, 3, 2)
      .fillRect(14, 12, 3, 2)
      // Reinforced metal corners.
      .fillStyle(0x89908a, 1)
      .fillRect(-23, -18, 5, 4)
      .fillRect(18, -18, 5, 4)
      .fillRect(-23, 14, 5, 4)
      .fillRect(18, 14, 5, 4);
  }

  private drawParachute(): void {
    this.parachute
      .lineStyle(1.5, 0xd6c8ac, 0.9)
      .lineBetween(-22, -17, -29, -45)
      .lineBetween(22, -17, 29, -45)
      .lineBetween(-7, -15, -10, -47)
      .lineBetween(7, -15, 10, -47)
      .fillStyle(0x2f493d, 1)
      .fillEllipse(0, -49, 66, 27)
      .fillStyle(0x496a58, 1)
      .fillEllipse(0, -53, 58, 19)
      .fillStyle(0x25382f, 0.9)
      .fillTriangle(-29, -50, -10, -62, -8, -43)
      .fillTriangle(29, -50, 10, -62, 8, -43)
      .lineStyle(2, 0x17231d, 0.9)
      .strokeEllipse(0, -49, 66, 27);
  }

  private drawSmoke(snapshot: SupplyDropSnapshot): void {
    const visible = snapshot.phase === 'landed' && !snapshot.crateOpened;
    this.smoke.clear().setVisible(visible);
    if (!visible) return;

    const time = snapshot.smokeElapsedMs / 1_000;
    this.smoke.setPosition(snapshot.target.x, snapshot.target.y);

    for (let index = 0; index < 15; index += 1) {
      const cycle = (time * 0.34 + index / 15) % 1;
      const rise = cycle * 118;
      const gust = Math.sin(time * 1.25) * cycle * 12;
      const swirl = Math.sin(time * 2.2 + index * 1.7) * (4 + cycle * 14);
      const drift = -cycle * 30 + gust + swirl;
      const pulse = Math.sin(time * 3.1 + index * 2.3) * 3;
      const width = 13 + cycle * 35 + pulse;
      const height = 10 + cycle * 23 - pulse * 0.25;
      const alpha = Math.max(0, (1 - cycle) * 0.62);
      const color = index % 3 === 0
        ? 0x7f1016
        : index % 2 === 0
          ? 0xb71920
          : 0xd12a30;

      this.smoke
        .fillStyle(color, alpha)
        .fillEllipse(drift, -24 - rise, width, height);
    }
  }

  private drawPlaneIndicator(): void {
    this.planeIndicatorBubble
      .fillStyle(0x091116, 0.88)
      .fillCircle(0, 0, 15)
      .lineStyle(2, 0x76b9d4, 0.95)
      .strokeCircle(0, 0, 15)
      .fillStyle(0x091116, 0.88)
      .fillTriangle(11, -6, 11, 6, 21, 0)
      .lineStyle(2, 0x76b9d4, 0.95)
      .lineBetween(11, -6, 21, 0)
      .lineBetween(21, 0, 11, 6);

    this.planeIndicatorIcon
      .fillStyle(0xa9d4e5, 1)
      .fillPoints([
        new Phaser.Geom.Point(11, 0),
        new Phaser.Geom.Point(2, -3),
        new Phaser.Geom.Point(-1, -10),
        new Phaser.Geom.Point(-4, -10),
        new Phaser.Geom.Point(-3, -2),
        new Phaser.Geom.Point(-10, -4),
        new Phaser.Geom.Point(-11, -1),
        new Phaser.Geom.Point(-4, 2),
        new Phaser.Geom.Point(-6, 7),
        new Phaser.Geom.Point(-3, 7),
        new Phaser.Geom.Point(1, 3),
      ], true);
  }

  private drawCrateIndicator(): void {
    this.crateIndicator
      .fillStyle(0x16090a, 0.88)
      .fillCircle(0, 0, 15)
      .lineStyle(2, 0xe5484d, 0.95)
      .strokeCircle(0, 0, 15)
      .fillStyle(0xff6267, 1)
      .fillTriangle(5, -7, 5, 7, 13, 0)
      .fillStyle(0xf3d4c0, 1)
      .fillRect(-8, -5, 9, 10)
      .fillStyle(0x7a2528, 1)
      .fillRect(-5, -5, 3, 10);
  }
}
