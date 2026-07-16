import { describe, expect, it } from 'vitest';

import {
  resolveAimAssist,
  type AimAssistConfig,
  type AimAssistTarget,
} from '../logic/aimAssist';
import { resolveHitscan } from '../logic/hitscan';

const config: AimAssistConfig = {
  acquisitionHalfAngleRadians: 12 * Math.PI / 180,
  retentionHalfAngleRadians: 16 * Math.PI / 180,
  maxTargetDistance: 480,
  viewportMargin: 0,
  angleWeight: 1,
  distanceWeight: 0.15,
  switchPenalty: 0.08,
};
const playerPosition = { x: 100, y: 100 };
const worldView = { x: 0, y: 0, width: 600, height: 400 };

function target(
  id: string,
  x: number,
  y: number,
  overrides: Partial<AimAssistTarget> = {},
): AimAssistTarget {
  return {
    id,
    position: { x, y },
    radius: 20,
    health: 50,
    active: true,
    ...overrides,
  };
}

function resolve(
  targets: readonly AimAssistTarget[],
  overrides: Partial<Parameters<typeof resolveAimAssist>[0]> = {},
) {
  return resolveAimAssist({
    enabled: true,
    playerPosition,
    manualAimDirection: { x: 1, y: 0 },
    currentTargetId: null,
    targets,
    worldView,
    config,
    ...overrides,
  });
}

describe('mobile aim assist', () => {
  it('returns manual aim when disabled or when no target is eligible', () => {
    const manualAimDirection = { x: 0, y: -1 };

    expect(resolve([target('candidate', 100, 20)], {
      enabled: false,
      manualAimDirection,
    })).toEqual({ targetId: null, finalAimDirection: manualAimDirection });
    expect(resolve([])).toEqual({
      targetId: null,
      finalAimDirection: { x: 1, y: 0 },
    });
  });

  it('filters dead, inactive, distant, off-cone, and off-screen targets', () => {
    const result = resolve([
      target('dead', 200, 100, { health: 0 }),
      target('inactive', 200, 100, { active: false }),
      target('distant', 581, 100),
      target('off-cone', 200, 150),
      target('off-screen', 700, 100),
      target('eligible', 300, 100),
    ]);

    expect(result.targetId).toBe('eligible');
  });

  it('accepts a target whose hit circle intersects the world view edge', () => {
    expect(resolve([target('edge', 615, 100)], {
      config: { ...config, maxTargetDistance: 600 },
    })).toMatchObject({ targetId: 'edge' });
  });

  it('rejects a target outside the world view even when it is in range and on-axis', () => {
    expect(resolve([target('off-screen', 650, 100)], {
      config: { ...config, maxTargetDistance: 600 },
    }).targetId).toBeNull();
  });

  it('prioritizes aim-line angle over a somewhat closer edge target', () => {
    const centered = target('centered', 400, 100);
    const angle = 10 * Math.PI / 180;
    const closerEdge = target(
      'closer-edge',
      100 + Math.cos(angle) * 120,
      100 + Math.sin(angle) * 120,
    );

    expect(resolve([closerEdge, centered]).targetId).toBe('centered');
  });

  it('uses target id as a deterministic tie breaker independent of input order', () => {
    const a = target('a', 300, 100);
    const b = target('b', 300, 100);

    expect(resolve([b, a]).targetId).toBe('a');
    expect(resolve([a, b]).targetId).toBe('a');
  });

  it('retains a current target for small changes within the wider retention cone', () => {
    const angle = 14 * Math.PI / 180;
    const retained = target(
      'retained',
      100 + Math.cos(angle) * 200,
      100 + Math.sin(angle) * 200,
    );

    expect(resolve([retained], { currentTargetId: retained.id }).targetId).toBe(retained.id);
    expect(resolve([retained], { currentTargetId: null }).targetId).toBeNull();
  });

  it('applies a switch penalty while the current target remains valid', () => {
    const angle = 3 * Math.PI / 180;
    const current = target(
      'current',
      100 + Math.cos(angle) * 180,
      100 + Math.sin(angle) * 180,
    );
    const challenger = target('challenger', 300, 100);

    expect(resolve([challenger, current], { currentTargetId: current.id }).targetId)
      .toBe(current.id);
  });

  it('releases an invalid current target and selects a normal acquisition candidate', () => {
    const outsideRetention = target('old', 100, 300);
    const replacement = target('new', 250, 100);

    expect(resolve([outsideRetention, replacement], { currentTargetId: 'old' }).targetId)
      .toBe('new');
    expect(resolve([replacement], { currentTargetId: 'removed' }).targetId).toBe('new');
    expect(resolve([
      target('dead-current', 200, 100, { health: 0 }),
      replacement,
    ], { currentTargetId: 'dead-current' }).targetId).toBe('new');
  });

  it('returns a unit direction from player to the selected target', () => {
    const result = resolve([target('diagonal', 200, 200)], {
      manualAimDirection: { x: 1, y: 1 },
      config: { ...config, acquisitionHalfAngleRadians: Math.PI / 2 },
    });

    expect(result.targetId).toBe('diagonal');
    expect(result.finalAimDirection.x).toBeCloseTo(Math.SQRT1_2);
    expect(result.finalAimDirection.y).toBeCloseTo(Math.SQRT1_2);
    expect(Math.hypot(result.finalAimDirection.x, result.finalAimDirection.y)).toBeCloseTo(1);
  });

  it('provides one final direction that makes hitscan hit the selected target', () => {
    const assistedTarget = target('assisted', 300, 130);
    const assist = resolve([assistedTarget]);
    const shot = resolveHitscan(
      playerPosition,
      assist.finalAimDirection,
      480,
      [{
        id: assistedTarget.id,
        position: assistedTarget.position,
        radius: assistedTarget.radius,
      }],
      1,
    );

    expect(assist.targetId).toBe(assistedTarget.id);
    expect(shot.hits[0]?.targetId).toBe(assistedTarget.id);
  });

  it('falls back to finite manual aim when player and target overlap', () => {
    const manualAimDirection = { x: 0, y: 1 };
    const result = resolve([target('overlap', 100, 100)], {
      manualAimDirection,
      config: { ...config, maxTargetDistance: 500 },
    });

    expect(result).toEqual({ targetId: null, finalAimDirection: manualAimDirection });
    expect(Number.isFinite(result.finalAimDirection.x)).toBe(true);
    expect(Number.isFinite(result.finalAimDirection.y)).toBe(true);
  });
});
