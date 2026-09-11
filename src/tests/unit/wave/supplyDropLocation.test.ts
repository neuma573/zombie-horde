import { describe, expect, it } from 'vitest';
import { selectSupplyDropLocation } from '../../../logic/supplyDrop';

describe('supply location selection', () => {
  const locationConfig = {
    sampleCount: 128,
    clearance: 30,
    normalMinimumPlayerDistance: 150,
    normalMaximumPlayerDistance: 500,
    emergencyMinimumPlayerDistance: 500,
    previousDropMinimumDistance: 180,
  };

  it('selects a reachable normal location outside obstacles and away from the previous drop', () => {
    const obstacles = [{ x: 350, y: 200, width: 200, height: 300 }];
    const target = selectSupplyDropLocation(
      'normal',
      { x: 100, y: 350 },
      { width: 900, height: 700 },
      obstacles,
      { x: 250, y: 350 },
      { x: 1, y: 0 },
      42,
      locationConfig,
    );

    expect(target).not.toBeNull();
    expect(Math.hypot(target!.x - 100, target!.y - 350)).toBeGreaterThanOrEqual(150);
    expect(Math.hypot(target!.x - 250, target!.y - 350)).toBeGreaterThanOrEqual(180);
    expect(
      target!.x >= 320 && target!.x <= 580
      && target!.y >= 170 && target!.y <= 530,
    ).toBe(false);
  });

  it('places emergency supply farther away and favors the threat direction', () => {
    const target = selectSupplyDropLocation(
      'emergency',
      { x: 300, y: 300 },
      { width: 1_400, height: 800 },
      [],
      null,
      { x: 1, y: 0 },
      7,
      locationConfig,
    );

    expect(target).not.toBeNull();
    expect(Math.hypot(target!.x - 300, target!.y - 300)).toBeGreaterThanOrEqual(500);
    expect(target!.x).toBeGreaterThan(300);
  });

  it('never relaxes the normal player-distance band when sampling misses', () => {
    const target = selectSupplyDropLocation(
      'normal',
      { x: 50, y: 50 },
      { width: 4_000, height: 3_000 },
      [],
      null,
      { x: 0, y: 0 },
      0,
      {
        ...locationConfig,
        sampleCount: 1,
        normalMinimumPlayerDistance: 150,
        normalMaximumPlayerDistance: 500,
      },
    );

    expect(target).not.toBeNull();
    const playerDistance = Math.hypot(target!.x - 50, target!.y - 50);
    expect(playerDistance).toBeGreaterThanOrEqual(150);
    expect(playerDistance).toBeLessThanOrEqual(500);
  });

  it('defers a normal drop when no reachable cell satisfies its distance band', () => {
    expect(selectSupplyDropLocation(
      'normal',
      { x: 100, y: 100 },
      { width: 220, height: 220 },
      [],
      null,
      { x: 0, y: 0 },
      0,
      {
        ...locationConfig,
        normalMinimumPlayerDistance: 500,
        normalMaximumPlayerDistance: 600,
      },
    )).toBeNull();
  });
});