import { describe, expect, it } from 'vitest';

import { PATHFINDING_CONFIG } from '../config/pathfindingConfig';
import { createPathfindingGrid } from '../logic/pathfinding';
import {
  createZombieNavigationState,
  updateZombieNavigation,
} from '../logic/zombieNavigation';

const bounds = { width: 400, height: 300 };
const wall = [{ x: 180, y: 20, width: 40, height: 220 }];
const navigationGrid = createPathfindingGrid(bounds, wall, {
  cellSize: 20,
  clearance: 10,
});
const config = {
  ...PATHFINDING_CONFIG,
  cellSize: 20,
  obstacleClearance: 0,
  waypointReachDistance: 8,
  maximumPathDeviation: 30,
};

describe('zombie navigation policy', () => {
  it('keeps direct chase and skips A* while line of travel is open', () => {
    const result = updateZombieNavigation(
      createZombieNavigationState(),
      { x: 20, y: 280 },
      { x: 380, y: 280 },
      navigationGrid,
      wall,
      10,
      18,
      config,
      16,
    );

    expect(result.mode).toBe('direct');
    expect(result.pathCalculated).toBe(false);
    expect(result.target).toEqual({ x: 380, y: 280 });
  });

  it('chases directly when contact range is reachable beside an obstacle', () => {
    const result = updateZombieNavigation(
      createZombieNavigationState(),
      { x: 80, y: 120 },
      { x: 162, y: 120 },
      navigationGrid,
      wall,
      20,
      18,
      config,
      16,
    );

    expect(result.mode).toBe('direct');
    expect(result.pathCalculated).toBe(false);
    expect(result.target).toEqual({ x: 162, y: 120 });
  });

  it('calculates a path only when blocked and returns to direct chase when opened', () => {
    const blocked = updateZombieNavigation(
      createZombieNavigationState(),
      { x: 80, y: 120 },
      { x: 320, y: 120 },
      navigationGrid,
      wall,
      10,
      18,
      config,
      16,
    );
    const opened = updateZombieNavigation(
      blocked.state,
      { x: 80, y: 260 },
      { x: 320, y: 260 },
      navigationGrid,
      wall,
      10,
      18,
      config,
      16,
    );

    expect(blocked.mode).toBe('path');
    expect(blocked.pathCalculated).toBe(true);
    expect(opened.mode).toBe('direct');
    expect(opened.state.waypoints).toEqual([]);
  });

  it('does not recalculate every frame for an unchanged target cell', () => {
    const first = updateZombieNavigation(
      createZombieNavigationState(),
      { x: 80, y: 120 },
      { x: 320, y: 120 },
      navigationGrid,
      wall,
      10,
      18,
      config,
      16,
    );
    const second = updateZombieNavigation(
      first.state,
      { x: 81, y: 120 },
      { x: 321, y: 121 },
      navigationGrid,
      wall,
      10,
      18,
      config,
      16,
    );

    expect(first.pathCalculated).toBe(true);
    expect(second.pathCalculated).toBe(false);
    expect(second.state.replanRemainingMs).toBeLessThan(first.state.replanRemainingMs);
  });

  it('retries an unreachable goal only after the configured interval', () => {
    const enclosure = [
      { x: 120, y: 80, width: 160, height: 20 },
      { x: 120, y: 200, width: 160, height: 20 },
      { x: 120, y: 100, width: 20, height: 100 },
      { x: 260, y: 100, width: 20, height: 100 },
    ];
    const enclosedGrid = createPathfindingGrid(bounds, enclosure, {
      cellSize: 20,
      clearance: 0,
    });
    const first = updateZombieNavigation(
      createZombieNavigationState(),
      { x: 40, y: 150 },
      { x: 200, y: 150 },
      enclosedGrid,
      enclosure,
      0,
      18,
      config,
      16,
    );
    const second = updateZombieNavigation(
      first.state,
      { x: 40, y: 150 },
      { x: 200, y: 150 },
      enclosedGrid,
      enclosure,
      0,
      18,
      config,
      16,
    );

    expect(first.pathCalculated).toBe(true);
    expect(first.state.waypoints).toEqual([]);
    expect(second.pathCalculated).toBe(false);
  });
});
