import Phaser from 'phaser';

import type {
  BuildingEntranceSide,
  BuildingStyle,
  UrbanMapObstacle,
} from '../config/urbanMapConfig';

interface BuildingPalette {
  sidewalk: number;
  wall: number;
  roof: number;
  roofLight: number;
  roofDark: number;
  parapet: number;
  trim: number;
  awning: number;
}

const BUILDING_PALETTES: Record<BuildingStyle, BuildingPalette> = {
  brick: {
    sidewalk: 0x73736c,
    wall: 0x73564d,
    roof: 0x49494a,
    roofLight: 0x718089,
    roofDark: 0x39454c,
    parapet: 0x8a746c,
    trim: 0xb49a82,
    awning: 0x8f6f45,
  },
  concrete: {
    sidewalk: 0x747873,
    wall: 0x626964,
    roof: 0x454b4d,
    roofLight: 0x747f80,
    roofDark: 0x3c4648,
    parapet: 0x8b918b,
    trim: 0xb0b7ad,
    awning: 0x526b66,
  },
  industrial: {
    sidewalk: 0x6d7375,
    wall: 0x52636b,
    roof: 0x3f484c,
    roofLight: 0x6e7f87,
    roofDark: 0x35434a,
    parapet: 0x748891,
    trim: 0xa4afb3,
    awning: 0x596f7c,
  },
};

export class BuildingVisual extends Phaser.GameObjects.Container {
  constructor(scene: Phaser.Scene, config: UrbanMapObstacle) {
    super(scene, config.x, config.y);

    const graphics = new Phaser.GameObjects.Graphics(scene);
    const palette = BUILDING_PALETTES[config.visual.style];
    this.drawBuilding(graphics, config, palette);
    this.add(graphics);
    scene.add.existing(this);
  }

  private drawBuilding(
    graphics: Phaser.GameObjects.Graphics,
    config: UrbanMapObstacle,
    palette: BuildingPalette,
  ): void {
    const { width, height } = config;
    const roofInset = 14;

    graphics
      .fillStyle(0x050708, 0.38)
      .fillRect(12, 14, width + 8, height + 8)
      .fillStyle(palette.sidewalk, 1)
      .fillRect(-10, -10, width + 20, height + 20)
      .lineStyle(2, 0x9a9b91, 0.55)
      .strokeRect(-10, -10, width + 20, height + 20)
      .fillStyle(palette.wall, 1)
      .fillRect(0, 0, width, height);

    if (config.visual.kind === 'house') {
      this.drawPitchedRoof(graphics, width, height, palette);
      this.drawHouseEntrance(graphics, width, height, config.visual.entranceSide, palette);
      return;
    }

    const facadeHeight = 28;
    const roofBottom = height - facadeHeight;
    graphics
      .fillStyle(palette.roofLight, 1)
      .fillRect(roofInset, roofInset, width - roofInset * 2, roofBottom - roofInset)
      .lineStyle(6, palette.parapet, 1)
      .strokeRect(9, 9, width - 18, roofBottom - 9)
      .lineStyle(3, palette.trim, 0.72)
      .lineBetween(12, 12, width - 12, 12)
      .lineBetween(12, 12, 12, roofBottom - 2)
      .lineStyle(7, palette.roofDark, 0.9)
      .lineBetween(12, roofBottom, width - 12, roofBottom)
      .lineBetween(width - 12, 12, width - 12, roofBottom)
      .fillStyle(palette.wall, 1)
      .fillRect(9, roofBottom, width - 18, facadeHeight - 9)
      .lineStyle(2, palette.trim, 0.7)
      .strokeRect(9, roofBottom, width - 18, facadeHeight - 9);

    const facadeWindowWidth = Math.min(44, width * 0.16);
    for (const centerX of [width * 0.3, width * 0.7]) {
      graphics
        .fillStyle(0x26383f, 1)
        .fillRect(centerX - facadeWindowWidth / 2, roofBottom + 7, facadeWindowWidth, 13)
        .lineStyle(2, 0xa5b4b5, 0.65)
        .strokeRect(centerX - facadeWindowWidth / 2, roofBottom + 7, facadeWindowWidth, 13);
    }

    this.drawFixtures(graphics, width, height, config.visual.fixtureVariant, palette);
    this.drawEntrance(
      graphics,
      width,
      height,
      config.visual.entranceSide,
      palette,
      config.visual.kind === 'storefront',
    );
  }

  private drawPitchedRoof(
    graphics: Phaser.GameObjects.Graphics,
    width: number,
    height: number,
    palette: BuildingPalette,
  ): void {
    const inset = 9;
    const left = inset;
    const right = width - inset;
    const top = inset;
    const facadeHeight = 34;
    const bottom = height - facadeHeight;
    const ridgeX = width / 2;
    const ridgeTop = top + (bottom - top) * 0.22;
    const ridgeBottom = bottom - (bottom - top) * 0.22;

    graphics
      .fillStyle(0x050708, 0.32)
      .fillRect(left + 7, top + 9, right - left, bottom - top)
      .fillStyle(palette.roof, 1)
      .fillPoints([
        { x: left, y: top },
        { x: ridgeX, y: ridgeTop },
        { x: ridgeX, y: ridgeBottom },
        { x: left, y: bottom },
      ], true)
      .fillStyle(palette.roofDark, 1)
      .fillPoints([
        { x: ridgeX, y: ridgeTop },
        { x: right, y: top },
        { x: right, y: bottom },
        { x: ridgeX, y: ridgeBottom },
      ], true)
      .fillStyle(palette.roofLight, 1)
      .fillTriangle(left, top, right, top, ridgeX, ridgeTop)
      .fillStyle(palette.parapet, 1)
      .fillTriangle(left, bottom, ridgeX, ridgeBottom, right, bottom)
      .lineStyle(5, 0x252e33, 0.9)
      .strokeRect(left, top, right - left, bottom - top)
      .lineBetween(left, top, ridgeX, ridgeTop)
      .lineBetween(right, top, ridgeX, ridgeTop)
      .lineBetween(left, bottom, ridgeX, ridgeBottom)
      .lineBetween(right, bottom, ridgeX, ridgeBottom)
      .lineStyle(7, palette.trim, 0.82)
      .lineBetween(ridgeX, ridgeTop, ridgeX, ridgeBottom)
      .lineStyle(2, 0xd5d8d2, 0.4)
      .lineBetween(ridgeX - 2, ridgeTop + 4, ridgeX - 2, ridgeBottom - 4)
      .fillStyle(0x353b3d, 1)
      .fillRect(ridgeX + 26, height * 0.3, 24, 30)
      .lineStyle(3, 0x81898a, 0.85)
      .strokeRect(ridgeX + 26, height * 0.3, 24, 30);

    for (let y = top + 24; y < bottom - 8; y += 24) {
      graphics
        .lineStyle(1, 0xc1b6a2, 0.18)
        .lineBetween(left + 8, y, ridgeX - 7, y)
        .lineBetween(ridgeX + 7, y, right - 8, y);
    }

    graphics
      .fillStyle(palette.wall, 1)
      .fillRect(left, bottom, right - left, facadeHeight - inset)
      .lineStyle(4, 0x272d30, 0.95)
      .lineBetween(left, bottom, right, bottom)
      .lineStyle(2, palette.trim, 0.7)
      .strokeRect(left, bottom, right - left, facadeHeight - inset);

    const windowWidth = Math.min(42, width * 0.16);
    for (const centerX of [width * 0.3, width * 0.7]) {
      graphics
        .fillStyle(0x26383f, 1)
        .fillRect(centerX - windowWidth / 2, bottom + 8, windowWidth, 15)
        .lineStyle(2, 0xa5b4b5, 0.75)
        .strokeRect(centerX - windowWidth / 2, bottom + 8, windowWidth, 15)
        .lineBetween(centerX, bottom + 9, centerX, bottom + 22);
    }
  }

  private drawFixtures(
    graphics: Phaser.GameObjects.Graphics,
    width: number,
    height: number,
    variant: 0 | 1 | 2,
    palette: BuildingPalette,
  ): void {
    const unitWidth = Math.min(56, Math.max(36, width * 0.24));
    const unitHeight = Math.min(40, Math.max(28, height * 0.14));
    const unitX = variant === 1 ? width - unitWidth - 34 : 34;
    const unitY = variant === 2 ? height - unitHeight - 38 : 38;

    graphics
      .fillStyle(0x242b2e, 0.7)
      .fillRect(unitX + 5, unitY + 6, unitWidth, unitHeight)
      .fillStyle(0x69757a, 1)
      .fillRect(unitX, unitY, unitWidth, unitHeight)
      .lineStyle(2, 0x30383b, 0.9)
      .strokeRect(unitX, unitY, unitWidth, unitHeight);

    for (let offset = 8; offset < unitWidth - 4; offset += 9) {
      graphics.lineBetween(unitX + offset, unitY + 6, unitX + offset, unitY + unitHeight - 6);
    }

    const ventX = variant === 0 ? width - 48 : 44;
    const ventY = variant === 2 ? 48 : height - 50;
    graphics
      .fillStyle(0x22292b, 0.55)
      .fillCircle(ventX + 3, ventY + 4, 13)
      .fillStyle(palette.trim, 0.8)
      .fillCircle(ventX, ventY, 12)
      .lineStyle(3, 0x424a4d, 0.9)
      .strokeCircle(ventX, ventY, 7)
      .lineBetween(ventX - 6, ventY, ventX + 6, ventY)
      .lineBetween(ventX, ventY - 6, ventX, ventY + 6);

    if (variant === 2) {
      graphics
        .lineStyle(5, 0x707b7e, 0.85)
        .lineBetween(width * 0.35, height * 0.35, width * 0.35, height * 0.68)
        .lineBetween(width * 0.35, height * 0.68, width * 0.62, height * 0.68);
    }
  }

  private drawEntrance(
    graphics: Phaser.GameObjects.Graphics,
    width: number,
    height: number,
    side: BuildingEntranceSide,
    palette: BuildingPalette,
    storefront = false,
  ): void {
    const doorWidth = 34;
    const doorDepth = 12;
    const facadeLength = side === 'east' || side === 'west' ? height : width;
    const awningWidth = storefront ? Math.min(112, Math.max(72, facadeLength * 0.38)) : 56;
    const awningDepth = storefront ? 24 : 18;

    graphics.fillStyle(0x1d2425, 1);
    switch (side) {
      case 'north': {
        const x = width / 2 - doorWidth / 2;
        graphics
          .fillRect(x, 0, doorWidth, doorDepth)
          .fillStyle(palette.awning, 1)
          .fillRect(width / 2 - awningWidth / 2, -awningDepth, awningWidth, awningDepth);
        break;
      }
      case 'east': {
        const y = height / 2 - doorWidth / 2;
        graphics
          .fillRect(width - doorDepth, y, doorDepth, doorWidth)
          .fillStyle(palette.awning, 1)
          .fillRect(width, height / 2 - awningWidth / 2, awningDepth, awningWidth);
        break;
      }
      case 'south': {
        const x = width / 2 - doorWidth / 2;
        graphics
          .fillRect(x, height - doorDepth, doorWidth, doorDepth)
          .fillStyle(palette.awning, 1)
          .fillRect(width / 2 - awningWidth / 2, height, awningWidth, awningDepth);
        break;
      }
      case 'west': {
        const y = height / 2 - doorWidth / 2;
        graphics
          .fillRect(0, y, doorDepth, doorWidth)
          .fillStyle(palette.awning, 1)
          .fillRect(-awningDepth, height / 2 - awningWidth / 2, awningDepth, awningWidth);
        break;
      }
    }

    if (storefront) {
      this.drawAwningStripes(graphics, width, height, side, awningWidth, awningDepth);
    }
  }

  private drawHouseEntrance(
    graphics: Phaser.GameObjects.Graphics,
    width: number,
    height: number,
    side: BuildingEntranceSide,
    palette: BuildingPalette,
  ): void {
    this.drawEntrance(graphics, width, height, side, palette);
    const porchDepth = 20;
    const porchWidth = 72;

    graphics.fillStyle(palette.sidewalk, 1);
    if (side === 'east' || side === 'west') {
      const x = side === 'east' ? width + 18 : -18 - porchDepth;
      graphics.fillRect(x, height / 2 - porchWidth / 2, porchDepth, porchWidth);
    } else {
      const y = side === 'south' ? height + 18 : -18 - porchDepth;
      graphics.fillRect(width / 2 - porchWidth / 2, y, porchWidth, porchDepth);
    }
  }

  private drawAwningStripes(
    graphics: Phaser.GameObjects.Graphics,
    width: number,
    height: number,
    side: BuildingEntranceSide,
    awningWidth: number,
    awningDepth: number,
  ): void {
    graphics.lineStyle(4, 0xd4c7a3, 0.72);
    const stripeSpacing = 14;

    if (side === 'east' || side === 'west') {
      const x = side === 'east' ? width + awningDepth / 2 : -awningDepth / 2;
      const top = height / 2 - awningWidth / 2 + 7;
      for (let y = top; y < top + awningWidth - 8; y += stripeSpacing) {
        graphics.lineBetween(x - awningDepth / 2 + 4, y, x + awningDepth / 2 - 4, y);
      }
      return;
    }

    const y = side === 'south' ? height + awningDepth / 2 : -awningDepth / 2;
    const left = width / 2 - awningWidth / 2 + 7;
    for (let x = left; x < left + awningWidth - 8; x += stripeSpacing) {
      graphics.lineBetween(x, y - awningDepth / 2 + 4, x, y + awningDepth / 2 - 4);
    }
  }
}
