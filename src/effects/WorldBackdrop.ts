import Phaser from 'phaser';

import type { RectangleObstacle } from '../logic/obstacleCollision';

export class WorldBackdrop {
  private readonly graphics: Phaser.GameObjects.Graphics;

  constructor(scene: Phaser.Scene) {
    this.graphics = scene.add.graphics().setDepth(-100);
  }

  resize(
    width: number,
    height: number,
    gridSize: number,
    roads: readonly RectangleObstacle[] = [],
    pavedAreas: readonly RectangleObstacle[] = [],
  ): void {
    const safeWidth = Math.max(0, width);
    const safeHeight = Math.max(0, height);
    const spacing = Math.max(1, gridSize);

    this.graphics
      .clear()
      .fillStyle(0x252a25, 1)
      .fillRect(0, 0, safeWidth, safeHeight)
      .lineStyle(1, 0x343a34, 0.35);

    for (let x = 0; x <= safeWidth; x += spacing) {
      this.graphics.lineBetween(x, 0, x, safeHeight);
    }
    for (let y = 0; y <= safeHeight; y += spacing) {
      this.graphics.lineBetween(0, y, safeWidth, y);
    }

    for (const area of pavedAreas) {
      this.graphics
        .fillStyle(0x2b3033, 1)
        .fillRect(area.x, area.y, area.width, area.height)
        .lineStyle(3, 0x555b5f, 0.8)
        .strokeRect(area.x, area.y, area.width, area.height);
    }

    this.graphics.lineStyle(2, 0xb7b095, 0.45);
    for (const area of pavedAreas) {
      for (let x = area.x + 28; x < area.x + area.width - 20; x += 64) {
        this.graphics.lineBetween(x, area.y + 22, x, area.y + 92);
        this.graphics.lineBetween(
          x,
          area.y + area.height - 92,
          x,
          area.y + area.height - 22,
        );
      }
    }

    for (const road of roads) {
      this.graphics
        .fillStyle(0x202329, 1)
        .fillRect(road.x, road.y, road.width, road.height);
    }

    this.graphics.lineStyle(4, 0x8f845d, 0.65);
    for (const [roadIndex, road] of roads.entries()) {
      const horizontal = road.width >= road.height;
      const length = horizontal ? road.width : road.height;
      const center = horizontal
        ? road.y + road.height / 2
        : road.x + road.width / 2;

      for (let offset = 24; offset < length; offset += 96) {
        const dashLength = Math.min(48, length - offset);
        const dashCenter = horizontal
          ? { x: road.x + offset + dashLength / 2, y: center }
          : { x: center, y: road.y + offset + dashLength / 2 };
        const insideIntersection = roads.some((otherRoad, otherIndex) => (
          otherIndex !== roadIndex
          && dashCenter.x >= otherRoad.x
          && dashCenter.x <= otherRoad.x + otherRoad.width
          && dashCenter.y >= otherRoad.y
          && dashCenter.y <= otherRoad.y + otherRoad.height
        ));

        if (insideIntersection) continue;

        if (horizontal) {
          this.graphics.lineBetween(road.x + offset, center, road.x + offset + dashLength, center);
        } else {
          this.graphics.lineBetween(center, road.y + offset, center, road.y + offset + dashLength);
        }
      }
    }

    this.graphics
      .lineStyle(3, 0x555555, 0.8)
      .strokeRect(0, 0, safeWidth, safeHeight);
  }

  destroy(): void {
    this.graphics.destroy();
  }
}
