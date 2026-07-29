import { describe, expect, it } from 'vitest';

import {
  cameraWorldView,
  createWorldSize,
} from '../logic/camera';
import {
  getEdgeSpawnPosition,
  getOffscreenEdgeSpawnPosition,
  zombieHealthForSpawn,
} from '../logic/spawn';
import { PISTOL_WEAPON } from '../config/weaponConfig';
import { ZOMBIE_CONFIG } from '../config/zombieConfig';

const noAvoidPosition = undefined;
const noMinimumDistance = 0;

function edgeFor(
  position: { x: number; y: number },
  bounds: { width: number; height: number },
  padding: number,
): string {
  if (position.y === padding) return 'top';
  if (position.x === bounds.width - padding) return 'right';
  if (position.y === bounds.height - padding) return 'bottom';
  if (position.x === padding) return 'left';
  return 'inside';
}

describe('getEdgeSpawnPosition', () => {
  it('uses every play-area edge once per shuffled group', () => {
    const bounds = { width: 360, height: 640 };
    const padding = 20;
    const seed = 0x1234;
    const positions = [0, 1, 2, 3].map((index) => (
      getEdgeSpawnPosition(
        index,
        bounds,
        padding,
        noAvoidPosition,
        noMinimumDistance,
        seed,
      )
    ));

    expect(new Set(positions.map((position) => edgeFor(position, bounds, padding)))).toEqual(
      new Set(['top', 'right', 'bottom', 'left']),
    );
  });

  it('varies repeated positions on each edge instead of reusing production points', () => {
    const bounds = { width: 360, height: 640 };
    const padding = 20;
    const positions = Array.from({ length: 16 }, (_, index) => (
      getEdgeSpawnPosition(index, bounds, padding, undefined, 0, 0x1234)
    ));

    for (const edge of ['top', 'right', 'bottom', 'left']) {
      const edgePositions = positions
        .filter((position) => edgeFor(position, bounds, padding) === edge)
        .map(({ x, y }) => `${x},${y}`);
      expect(edgePositions).toHaveLength(4);
      expect(new Set(edgePositions).size).toBe(edgePositions.length);
    }
  });

  it('uses resized landscape bounds for later spawns', () => {
    const bounds = { width: 960, height: 540 };
    const padding = 20;
    const position = getEdgeSpawnPosition(5, bounds, padding, undefined, 0, 0x1234);

    expect(edgeFor(position, bounds, padding)).not.toBe('inside');
    expect(position.x).toBeGreaterThanOrEqual(padding);
    expect(position.x).toBeLessThanOrEqual(bounds.width - padding);
    expect(position.y).toBeGreaterThanOrEqual(padding);
    expect(position.y).toBeLessThanOrEqual(bounds.height - padding);
  });

  it('chooses another shuffled edge when the scheduled edge is too close to the player', () => {
    const bounds = { width: 360, height: 640 };
    const padding = 20;
    const seed = 0x1234;
    const scheduled = getEdgeSpawnPosition(0, bounds, padding, undefined, 0, seed);
    const position = getEdgeSpawnPosition(0, bounds, padding, scheduled, 160, seed);

    expect(position).not.toEqual(scheduled);
    expect(Math.hypot(position.x - scheduled.x, position.y - scheduled.y)).toBeGreaterThanOrEqual(
      160,
    );
  });

  it('uses a far edge when a small viewport cannot satisfy the minimum distance', () => {
    const avoidPosition = { x: 50, y: 20 };
    const position = getEdgeSpawnPosition(
      0,
      { width: 100, height: 100 },
      20,
      avoidPosition,
      160,
      0x1234,
    );

    expect(Math.hypot(position.x - avoidPosition.x, position.y - avoidPosition.y))
      .toBeGreaterThan(50);
  });

  it('is deterministic for a fixed seed and changes order for another seed', () => {
    const bounds = { width: 2_400, height: 1_600 };
    const sequence = (seed: number) => Array.from({ length: 12 }, (_, index) => (
      getEdgeSpawnPosition(index, bounds, 20, { x: 1_200, y: 800 }, 160, seed)
    ));

    expect(sequence(37)).toEqual(sequence(37));
    expect(sequence(37)).not.toEqual(sequence(38));
  });
});

describe('balanced zombie spawning', () => {
  it('assigns a fixed three-shot or four-shot pistol durability at spawn', () => {
    const healthValues = Array.from({ length: 32 }, (_, index) => (
      zombieHealthForSpawn(
        index,
        42,
        PISTOL_WEAPON.config.damage,
        ZOMBIE_CONFIG.durabilityShots,
      )
    ));

    expect(new Set(healthValues)).toEqual(new Set([
      PISTOL_WEAPON.config.damage * 3,
      PISTOL_WEAPON.config.damage * 4,
    ]));
    expect(zombieHealthForSpawn(
      7,
      42,
      PISTOL_WEAPON.config.damage,
      ZOMBIE_CONFIG.durabilityShots,
    )).toBe(healthValues[7]);
  });

  it('uses the exact 1.25 speed multiplier without changing attack balance', () => {
    expect(ZOMBIE_CONFIG.speed).toBe(80 * 1.25);
    expect(ZOMBIE_CONFIG.contactDamage).toBe(10);
    expect(ZOMBIE_CONFIG.attackIntervalMs).toBe(800);
  });

  it('selects an obstacle-free map edge outside the current camera view', () => {
    const cameraView = { x: 300, y: 200, width: 400, height: 300 };
    const obstacle = { x: 0, y: 0, width: 180, height: 180 };
    const position = getOffscreenEdgeSpawnPosition(
      0,
      { width: 1_000, height: 700 },
      20,
      { x: 500, y: 350 },
      160,
      cameraView,
      [obstacle],
      42,
    );
    expect(position).not.toBeNull();
    if (!position) throw new Error('Expected an off-screen spawn position');

    const insideCamera = (
      position.x >= cameraView.x - 20
      && position.x <= cameraView.x + cameraView.width + 20
      && position.y >= cameraView.y - 20
      && position.y <= cameraView.y + cameraView.height + 20
    );
    expect(insideCamera).toBe(false);
    expect(
      position.x >= obstacle.x - 20
      && position.x <= obstacle.x + obstacle.width + 20
      && position.y >= obstacle.y - 20
      && position.y <= obstacle.y + obstacle.height + 20,
    ).toBe(false);
    expect(Math.hypot(position.x - 500, position.y - 350)).toBeGreaterThanOrEqual(160);
  });

  it('excludes a landed supply crate from edge spawn candidates', () => {
    const bounds = { width: 1_000, height: 700 };
    const cameraView = { x: 300, y: 200, width: 400, height: 300 };
    const firstCandidate = getOffscreenEdgeSpawnPosition(
      0,
      bounds,
      20,
      { x: 500, y: 350 },
      160,
      cameraView,
      [],
      42,
    );
    expect(firstCandidate).not.toBeNull();
    if (!firstCandidate) throw new Error('Expected an initial edge candidate');

    const crate = {
      x: firstCandidate.x - 30,
      y: firstCandidate.y - 30,
      width: 60,
      height: 60,
    };
    const position = getOffscreenEdgeSpawnPosition(
      0,
      bounds,
      20,
      { x: 500, y: 350 },
      160,
      cameraView,
      [crate],
      42,
    );

    expect(position).not.toBeNull();
    if (!position) throw new Error('Expected an alternate edge candidate');
    expect(
      position.x >= crate.x - 20
      && position.x <= crate.x + crate.width + 20
      && position.y >= crate.y - 20
      && position.y <= crate.y + crate.height + 20,
    ).toBe(false);
  });

  it('does not reuse look-ahead positions for consecutive offscreen spawns', () => {
    const positions = Array.from({ length: 12 }, (_, index) => (
      getOffscreenEdgeSpawnPosition(
        index,
        { width: 1_000, height: 700 },
        20,
        { x: 850, y: 350 },
        160,
        { x: 520, y: 40, width: 460, height: 620 },
        [{ x: 0, y: 0, width: 260, height: 180 }],
        42,
      )
    ));

    expect(positions.every((position) => position !== null)).toBe(true);
    expect(new Set(positions.map((position) => `${position?.x}:${position?.y}`)).size)
      .toBe(positions.length);
  });

  it('defers spawning when the camera covers every valid map edge', () => {
    const position = getOffscreenEdgeSpawnPosition(
      0,
      { width: 1_000, height: 700 },
      20,
      { x: 500, y: 350 },
      160,
      { x: 0, y: 0, width: 1_000, height: 700 },
      [],
      42,
    );

    expect(position).toBeNull();
  });

  it('retains an off-screen edge on a full-map high-resolution viewport', () => {
    const viewport = { width: 4_000, height: 3_000 };
    const zombieRadius = 20;
    const world = createWorldSize(
      { width: 4_000, height: 3_000 },
      viewport,
      0.75,
      zombieRadius * 4 + 1,
    );
    const cameraView = cameraWorldView(
      {
        x: (world.width - viewport.width) / 2,
        y: (world.height - viewport.height) / 2,
      },
      viewport,
      0.75,
    );
    const position = getOffscreenEdgeSpawnPosition(
      0,
      world,
      zombieRadius,
      { x: world.width / 2, y: world.height / 2 },
      160,
      cameraView,
      [],
      42,
    );

    expect(position).not.toBeNull();
  });
});
