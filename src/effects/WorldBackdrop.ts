import Phaser from 'phaser';

import type { UrbanRoad } from '../config/urbanMapConfig';
import type { RectangleObstacle } from '../logic/obstacleCollision';
import { PEDESTRIAN_ARROW_TEXTURE_KEY } from './gameAssetPreloader';

export class WorldBackdrop {
  private readonly scene: Phaser.Scene;
  private readonly graphics: Phaser.GameObjects.Graphics;
  private readonly roadLabels: Phaser.GameObjects.Text[] = [];
  private readonly directionArrows: Phaser.GameObjects.Image[] = [];

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.graphics = scene.add.graphics().setDepth(-100);
  }

  resize(
    width: number,
    height: number,
    gridSize: number,
    roads: readonly UrbanRoad[] = [],
    pavedAreas: readonly RectangleObstacle[] = [],
    parkingSlotSpacing = 112,
    sidewalkWidth = 108,
  ): void {
    const safeWidth = Math.max(0, width);
    const safeHeight = Math.max(0, height);
    const spacing = Math.max(1, gridSize);

    for (const label of this.roadLabels.splice(0)) {
      label.destroy();
    }
    for (const arrow of this.directionArrows.splice(0)) {
      arrow.destroy();
    }

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

    this.drawSidewalks(roads, sidewalkWidth);

    for (const road of roads) {
      this.graphics
        .fillStyle(0x202329, 1)
        .fillRect(road.x, road.y, road.width, road.height);
    }

    for (const road of roads) {
      if (road.kind === 'main') {
        this.drawRoadMarking(road, roads, 0, 0xc2a84d, 5, 24, 0);
        const laneOffset = (road.width >= road.height ? road.height : road.width) / 4;
        this.drawRoadMarking(road, roads, -laneOffset, 0xd8ddda, 4, 48, 48, 420);
        this.drawRoadMarking(road, roads, laneOffset, 0xd8ddda, 4, 48, 48, 420);
      } else {
        this.drawRoadMarking(road, roads, 0, 0x8f845d, 4, 48, 48);
      }
    }

    this.drawParkingAreas(pavedAreas, parkingSlotSpacing, sidewalkWidth);

    for (let firstIndex = 0; firstIndex < roads.length; firstIndex += 1) {
      for (let secondIndex = firstIndex + 1; secondIndex < roads.length; secondIndex += 1) {
        const first = roads[firstIndex];
        const second = roads[secondIndex];
        const horizontal = first.width >= first.height ? first : second;
        const vertical = horizontal === first ? second : first;
        const isOrthogonal = horizontal.width >= horizontal.height
          && vertical.height > vertical.width;
        const intersects = horizontal.x <= vertical.x + vertical.width
          && horizontal.x + horizontal.width >= vertical.x
          && horizontal.y <= vertical.y + vertical.height
          && horizontal.y + horizontal.height >= vertical.y;

        if (!isOrthogonal || !intersects) continue;
        if (first.kind === 'main' && second.kind === 'main') {
          this.drawStopLines(horizontal, vertical);
        }
      }
    }

    this.graphics
      .lineStyle(3, 0x555555, 0.8)
      .strokeRect(0, 0, safeWidth, safeHeight);
  }

  destroy(): void {
    for (const label of this.roadLabels.splice(0)) {
      label.destroy();
    }
    for (const arrow of this.directionArrows.splice(0)) {
      arrow.destroy();
    }
    this.graphics.destroy();
  }

  private drawRoadMarking(
    road: UrbanRoad,
    roads: readonly UrbanRoad[],
    lateralOffset: number,
    color: number,
    lineWidth: number,
    markLength: number,
    gapLength: number,
    intersectionClearance = 0,
  ): void {
    const horizontal = road.width >= road.height;
    const length = horizontal ? road.width : road.height;
    const center = (horizontal ? road.y + road.height / 2 : road.x + road.width / 2)
      + lateralOffset;
    const step = Math.max(1, markLength + gapLength);

    this.graphics.lineStyle(lineWidth, color, 0.85);
    for (let offset = 0; offset < length; offset += step) {
      const currentLength = Math.min(markLength, length - offset);
      const markStart = horizontal ? road.x + offset : road.y + offset;
      const markEnd = markStart + currentLength;
      const insideIntersection = roads.some((otherRoad) => (
        otherRoad !== road
        && (horizontal
          ? (
            center >= otherRoad.y
            && center <= otherRoad.y + otherRoad.height
            && markEnd >= otherRoad.x - (
              otherRoad.kind === 'main' ? intersectionClearance : 0
            )
            && markStart <= otherRoad.x + otherRoad.width + (
              otherRoad.kind === 'main' ? intersectionClearance : 0
            )
          )
          : (
            center >= otherRoad.x
            && center <= otherRoad.x + otherRoad.width
            && markEnd >= otherRoad.y - (
              otherRoad.kind === 'main' ? intersectionClearance : 0
            )
            && markStart <= otherRoad.y + otherRoad.height + (
              otherRoad.kind === 'main' ? intersectionClearance : 0
            )
          ))
      ));

      if (insideIntersection) continue;

      if (horizontal) {
        this.graphics.lineBetween(
          road.x + offset,
          center,
          road.x + offset + currentLength,
          center,
        );
      } else {
        this.graphics.lineBetween(
          center,
          road.y + offset,
          center,
          road.y + offset + currentLength,
        );
      }
    }
  }

  private drawSidewalks(roads: readonly UrbanRoad[], width: number): void {
    const sidewalkWidth = Math.max(0, width);
    if (sidewalkWidth === 0) return;

    for (const road of roads) {
      this.graphics
        .fillStyle(0x777a73, 1)
        .fillRect(
          road.x - sidewalkWidth,
          road.y - sidewalkWidth,
          road.width + sidewalkWidth * 2,
          road.height + sidewalkWidth * 2,
        );
    }

    this.graphics.lineStyle(3, 0xa6a79d, 0.9);
    for (const road of roads) {
      const horizontal = road.width >= road.height;
      if (horizontal) {
        this.graphics.lineBetween(
          road.x,
          road.y - sidewalkWidth,
          road.x + road.width,
          road.y - sidewalkWidth,
        );
        this.graphics.lineBetween(
          road.x,
          road.y + road.height + sidewalkWidth,
          road.x + road.width,
          road.y + road.height + sidewalkWidth,
        );

        this.graphics.lineStyle(1, 0x555a55, 0.7);
        for (let x = road.x; x <= road.x + road.width; x += 64) {
          this.graphics.lineBetween(
            x,
            road.y - sidewalkWidth,
            x,
            road.y,
          );
          this.graphics.lineBetween(
            x,
            road.y + road.height,
            x,
            road.y + road.height + sidewalkWidth,
          );
        }
      } else {
        this.graphics.lineStyle(3, 0xa6a79d, 0.9);
        this.graphics.lineBetween(
          road.x - sidewalkWidth,
          road.y,
          road.x - sidewalkWidth,
          road.y + road.height,
        );
        this.graphics.lineBetween(
          road.x + road.width + sidewalkWidth,
          road.y,
          road.x + road.width + sidewalkWidth,
          road.y + road.height,
        );

        this.graphics.lineStyle(1, 0x555a55, 0.7);
        for (let y = road.y; y <= road.y + road.height; y += 64) {
          this.graphics.lineBetween(
            road.x - sidewalkWidth,
            y,
            road.x,
            y,
          );
          this.graphics.lineBetween(
            road.x + road.width,
            y,
            road.x + road.width + sidewalkWidth,
            y,
          );
        }
      }

      this.graphics.lineStyle(3, 0xa6a79d, 0.9);
    }
  }

  private drawParkingAreas(
    pavedAreas: readonly RectangleObstacle[],
    slotSpacing: number,
    sidewalkWidth: number,
  ): void {
    const stallDepth = 180;
    const pavementInset = sidewalkWidth + 20;

    this.graphics.lineStyle(4, 0xd8d2b5, 0.9);
    for (const area of pavedAreas) {
      for (
        let x = area.x + pavementInset;
        x <= area.x + area.width - pavementInset;
        x += Math.max(1, slotSpacing)
      ) {
        this.graphics.lineBetween(
          x,
          area.y + pavementInset,
          x,
          area.y + pavementInset + stallDepth,
        );
        this.graphics.lineBetween(
          x,
          area.y + area.height - pavementInset - stallDepth,
          x,
          area.y + area.height - pavementInset,
        );
      }
    }
  }

  private drawStopLines(horizontal: UrbanRoad, vertical: UrbanRoad): void {
    const horizontalCenter = horizontal.y + horizontal.height / 2;
    const verticalCenter = vertical.x + vertical.width / 2;
    const setback = 272;
    const edgeInset = 18;
    const centerGap = 12;
    const laneDividerLength = 112;
    const crosswalkNearInset = 16;
    const crosswalkFarInset = 256;
    const crosswalkStripeWidth = 16;
    const crosswalkStripeGap = 14;
    const crosswalkFlowGap = 16;
    const crosswalkArrowReserve = 68;
    const intersectionClearance = 420;

    this.graphics.lineStyle(7, 0xf0f1eb, 0.9);
    this.graphics.lineBetween(
      vertical.x - setback,
      horizontalCenter + centerGap,
      vertical.x - setback,
      horizontal.y + horizontal.height - edgeInset,
    );
    this.graphics.lineBetween(
      vertical.x + vertical.width + setback,
      horizontal.y + edgeInset,
      vertical.x + vertical.width + setback,
      horizontalCenter - centerGap,
    );
    this.graphics.lineBetween(
      vertical.x + edgeInset,
      horizontal.y - setback,
      verticalCenter - centerGap,
      horizontal.y - setback,
    );
    this.graphics.lineBetween(
      verticalCenter + centerGap,
      horizontal.y + horizontal.height + setback,
      vertical.x + vertical.width - edgeInset,
      horizontal.y + horizontal.height + setback,
    );

    const horizontalLaneOffset = horizontal.height / 4;
    const verticalLaneOffset = vertical.width / 4;

    this.graphics.lineStyle(4, 0xd8ddda, 0.9);
    this.graphics.lineBetween(
      vertical.x - setback - laneDividerLength,
      horizontalCenter + horizontalLaneOffset,
      vertical.x - setback,
      horizontalCenter + horizontalLaneOffset,
    );
    this.graphics.lineBetween(
      vertical.x + vertical.width + setback,
      horizontalCenter - horizontalLaneOffset,
      vertical.x + vertical.width + setback + laneDividerLength,
      horizontalCenter - horizontalLaneOffset,
    );
    this.graphics.lineBetween(
      verticalCenter - verticalLaneOffset,
      horizontal.y - setback - laneDividerLength,
      verticalCenter - verticalLaneOffset,
      horizontal.y - setback,
    );
    this.graphics.lineBetween(
      verticalCenter + verticalLaneOffset,
      horizontal.y + horizontal.height + setback,
      verticalCenter + verticalLaneOffset,
      horizontal.y + horizontal.height + setback + laneDividerLength,
    );
    const outboundDashLength = 48;
    const outboundDashStep = 96;
    for (
      let x = vertical.x - intersectionClearance;
      x < vertical.x - crosswalkFarInset;
      x += outboundDashStep
    ) {
      this.graphics.lineBetween(
        x,
        horizontalCenter - horizontalLaneOffset,
        Math.min(x + outboundDashLength, vertical.x - crosswalkFarInset),
        horizontalCenter - horizontalLaneOffset,
      );
    }
    for (
      let x = vertical.x + vertical.width + crosswalkFarInset;
      x < vertical.x + vertical.width + intersectionClearance;
      x += outboundDashStep
    ) {
      this.graphics.lineBetween(
        x,
        horizontalCenter + horizontalLaneOffset,
        Math.min(
          x + outboundDashLength,
          vertical.x + vertical.width + intersectionClearance,
        ),
        horizontalCenter + horizontalLaneOffset,
      );
    }
    for (
      let y = horizontal.y - intersectionClearance;
      y < horizontal.y - crosswalkFarInset;
      y += outboundDashStep
    ) {
      this.graphics.lineBetween(
        verticalCenter + verticalLaneOffset,
        y,
        verticalCenter + verticalLaneOffset,
        Math.min(y + outboundDashLength, horizontal.y - crosswalkFarInset),
      );
    }
    for (
      let y = horizontal.y + horizontal.height + crosswalkFarInset;
      y < horizontal.y + horizontal.height + intersectionClearance;
      y += outboundDashStep
    ) {
      this.graphics.lineBetween(
        verticalCenter - verticalLaneOffset,
        y,
        verticalCenter - verticalLaneOffset,
        Math.min(
          y + outboundDashLength,
          horizontal.y + horizontal.height + intersectionClearance,
        ),
      );
    }

    const crosswalkDepth = crosswalkFarInset - crosswalkNearInset;
    const crosswalkFlowDepth = (crosswalkDepth - crosswalkFlowGap) / 2;
    const crosswalkClearPadding = 8;
    this.graphics
      .fillStyle(0x202329, 1)
      .fillRect(
        vertical.x - crosswalkFarInset - crosswalkClearPadding,
        horizontal.y,
        crosswalkDepth + crosswalkClearPadding * 2,
        horizontal.height,
      )
      .fillRect(
        vertical.x + vertical.width + crosswalkNearInset - crosswalkClearPadding,
        horizontal.y,
        crosswalkDepth + crosswalkClearPadding * 2,
        horizontal.height,
      )
      .fillRect(
        vertical.x,
        horizontal.y - crosswalkFarInset - crosswalkClearPadding,
        vertical.width,
        crosswalkDepth + crosswalkClearPadding * 2,
      )
      .fillRect(
        vertical.x,
        horizontal.y + horizontal.height + crosswalkNearInset - crosswalkClearPadding,
        vertical.width,
        crosswalkDepth + crosswalkClearPadding * 2,
      )
      .fillStyle(0xf0f1eb, 0.88);

    for (
      let y = horizontal.y + edgeInset;
      y <= horizontal.y + horizontal.height - edgeInset
        - crosswalkArrowReserve - crosswalkStripeWidth;
      y += crosswalkStripeWidth + crosswalkStripeGap
    ) {
      this.graphics.fillRect(
        vertical.x - crosswalkFarInset,
        y,
        crosswalkFlowDepth,
        crosswalkStripeWidth,
      );
    }
    for (
      let y = horizontal.y + edgeInset + crosswalkArrowReserve;
      y <= horizontal.y + horizontal.height - edgeInset - crosswalkStripeWidth;
      y += crosswalkStripeWidth + crosswalkStripeGap
    ) {
      this.graphics.fillRect(
        vertical.x - crosswalkNearInset - crosswalkFlowDepth,
        y,
        crosswalkFlowDepth,
        crosswalkStripeWidth,
      );
    }
    for (
      let y = horizontal.y + edgeInset;
      y <= horizontal.y + horizontal.height - edgeInset
        - crosswalkArrowReserve - crosswalkStripeWidth;
      y += crosswalkStripeWidth + crosswalkStripeGap
    ) {
      this.graphics.fillRect(
        vertical.x + vertical.width + crosswalkNearInset,
        y,
        crosswalkFlowDepth,
        crosswalkStripeWidth,
      );
    }
    for (
      let y = horizontal.y + edgeInset + crosswalkArrowReserve;
      y <= horizontal.y + horizontal.height - edgeInset - crosswalkStripeWidth;
      y += crosswalkStripeWidth + crosswalkStripeGap
    ) {
      this.graphics.fillRect(
        vertical.x + vertical.width + crosswalkFarInset - crosswalkFlowDepth,
        y,
        crosswalkFlowDepth,
        crosswalkStripeWidth,
      );
    }
    for (
      let x = vertical.x + edgeInset;
      x <= vertical.x + vertical.width - edgeInset
        - crosswalkArrowReserve - crosswalkStripeWidth;
      x += crosswalkStripeWidth + crosswalkStripeGap
    ) {
      this.graphics.fillRect(
        x,
        horizontal.y - crosswalkFarInset,
        crosswalkStripeWidth,
        crosswalkFlowDepth,
      );
    }
    for (
      let x = vertical.x + edgeInset + crosswalkArrowReserve;
      x <= vertical.x + vertical.width - edgeInset - crosswalkStripeWidth;
      x += crosswalkStripeWidth + crosswalkStripeGap
    ) {
      this.graphics.fillRect(
        x,
        horizontal.y - crosswalkNearInset - crosswalkFlowDepth,
        crosswalkStripeWidth,
        crosswalkFlowDepth,
      );
    }
    for (
      let x = vertical.x + edgeInset;
      x <= vertical.x + vertical.width - edgeInset
        - crosswalkArrowReserve - crosswalkStripeWidth;
      x += crosswalkStripeWidth + crosswalkStripeGap
    ) {
      this.graphics.fillRect(
        x,
        horizontal.y + horizontal.height + crosswalkNearInset,
        crosswalkStripeWidth,
        crosswalkFlowDepth,
      );
    }
    for (
      let x = vertical.x + edgeInset + crosswalkArrowReserve;
      x <= vertical.x + vertical.width - edgeInset - crosswalkStripeWidth;
      x += crosswalkStripeWidth + crosswalkStripeGap
    ) {
      this.graphics.fillRect(
        x,
        horizontal.y + horizontal.height + crosswalkFarInset - crosswalkFlowDepth,
        crosswalkStripeWidth,
        crosswalkFlowDepth,
      );
    }

    const westOuterFlowX = vertical.x - crosswalkFarInset + crosswalkFlowDepth / 2;
    const westInnerFlowX = vertical.x - crosswalkNearInset - crosswalkFlowDepth / 2;
    const eastInnerFlowX = vertical.x + vertical.width
      + crosswalkNearInset + crosswalkFlowDepth / 2;
    const eastOuterFlowX = vertical.x + vertical.width
      + crosswalkFarInset - crosswalkFlowDepth / 2;
    const northOuterFlowY = horizontal.y - crosswalkFarInset + crosswalkFlowDepth / 2;
    const northInnerFlowY = horizontal.y - crosswalkNearInset - crosswalkFlowDepth / 2;
    const southInnerFlowY = horizontal.y + horizontal.height
      + crosswalkNearInset + crosswalkFlowDepth / 2;
    const southOuterFlowY = horizontal.y + horizontal.height
      + crosswalkFarInset - crosswalkFlowDepth / 2;
    const arrowCenterOffset = edgeInset + crosswalkArrowReserve / 2;

    this.addDoubleDirectionArrow(
      westOuterFlowX,
      horizontal.y + horizontal.height - arrowCenterOffset,
      90,
      24,
      0,
    );
    this.addDoubleDirectionArrow(
      westInnerFlowX,
      horizontal.y + arrowCenterOffset,
      -90,
      24,
      0,
    );
    this.addDoubleDirectionArrow(
      eastInnerFlowX,
      horizontal.y + horizontal.height - arrowCenterOffset,
      90,
      24,
      0,
    );
    this.addDoubleDirectionArrow(
      eastOuterFlowX,
      horizontal.y + arrowCenterOffset,
      -90,
      24,
      0,
    );
    this.addDoubleDirectionArrow(
      vertical.x + vertical.width - arrowCenterOffset,
      northOuterFlowY,
      0,
      0,
      24,
    );
    this.addDoubleDirectionArrow(
      vertical.x + arrowCenterOffset,
      northInnerFlowY,
      180,
      0,
      24,
    );
    this.addDoubleDirectionArrow(
      vertical.x + vertical.width - arrowCenterOffset,
      southInnerFlowY,
      0,
      0,
      24,
    );
    this.addDoubleDirectionArrow(
      vertical.x + arrowCenterOffset,
      southOuterFlowY,
      180,
      0,
      24,
    );

    const labelDistance = 352;
    const innerLaneOffset = horizontal.height / 8;
    const outerLaneOffset = horizontal.height * 3 / 8;

    for (const laneOffset of [innerLaneOffset, outerLaneOffset]) {
      this.addStopLabel(
        vertical.x - labelDistance,
        horizontalCenter + laneOffset,
        90,
      );
      this.addStopLabel(
        vertical.x + vertical.width + labelDistance,
        horizontalCenter - laneOffset,
        -90,
      );
      this.addStopLabel(
        verticalCenter - laneOffset,
        horizontal.y - labelDistance,
        180,
      );
      this.addStopLabel(
        verticalCenter + laneOffset,
        horizontal.y + horizontal.height + labelDistance,
        0,
      );
    }
  }

  private addStopLabel(x: number, y: number, angle: number): void {
    const label = this.scene.add.text(x, y, 'STOP', {
      color: '#d8ddda',
      fontFamily: 'Arial Black, Arial, sans-serif',
      fontSize: '30px',
      fontStyle: 'bold',
    })
      .setOrigin(0.5)
      .setAngle(angle)
      .setAlpha(0.9)
      .setDepth(-99);
    this.roadLabels.push(label);
  }

  private addDirectionArrow(
    x: number,
    y: number,
    angle: number,
  ): void {
    const arrow = this.scene.add.image(x, y, PEDESTRIAN_ARROW_TEXTURE_KEY)
      .setOrigin(0.5)
      .setAngle(angle)
      .setScale(1.15)
      .setAlpha(0.9)
      .setDepth(-99);
    this.directionArrows.push(arrow);
  }

  private addDoubleDirectionArrow(
    x: number,
    y: number,
    angle: number,
    spreadX: number,
    spreadY: number,
  ): void {
    this.addDirectionArrow(x - spreadX, y - spreadY, angle);
    this.addDirectionArrow(x + spreadX, y + spreadY, angle);
  }
}
