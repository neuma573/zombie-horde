import { describe, expect, it } from 'vitest';

import {
  resolveAimAssist,
  shouldReleaseAimLock,
  shouldApplyMobileAimAssist,
  type AimAssistConfig,
  type AimAssistTarget,
} from '../logic/aimAssist';
import { resolveHitscan } from '../logic/hitscan';

const config: AimAssistConfig = {
  acquisitionHalfAngleRadians: 12 * Math.PI / 180,
  manualReleaseAngleRadians: 16 * Math.PI / 180,
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
    viewDirection: { x: 1, y: 0 },
    currentTargetId: null,
    targets,
    worldView,
    hitscanRange: 600,
    config,
    ...overrides,
  });
}

describe('mobile aim assist', () => {
  it('requires a fresh mobile aim source after lifecycle cancellation', () => {
    expect(shouldApplyMobileAimAssist(true, 'mobile')).toBe(true);
    expect(shouldApplyMobileAimAssist(true, 'none')).toBe(false);
    expect(shouldApplyMobileAimAssist(true, 'mouse')).toBe(false);
    expect(shouldApplyMobileAimAssist(false, 'mobile')).toBe(false);
  });

  it('releases a lock only after manual input crosses the configured angle', () => {
    const smallChange = 10 * Math.PI / 180;
    const largeChange = 20 * Math.PI / 180;

    expect(shouldReleaseAimLock(
      { x: 1, y: 0 },
      { x: Math.cos(smallChange), y: Math.sin(smallChange) },
      16 * Math.PI / 180,
    )).toBe(false);
    expect(shouldReleaseAimLock(
      { x: 1, y: 0 },
      { x: Math.cos(largeChange), y: Math.sin(largeChange) },
      16 * Math.PI / 180,
    )).toBe(true);
    expect(shouldReleaseAimLock(null, { x: 0, y: 1 }, 0)).toBe(false);
  });

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

  it('uses true circle intersection at viewport corners', () => {
    const wideConeConfig = {
      ...config,
      acquisitionHalfAngleRadians: Math.PI / 2,
      maxTargetDistance: 700,
    };

    expect(resolve([target('outside-corner', 615, 415)], {
      config: wideConeConfig,
    }).targetId).toBeNull();
    expect(resolve([target('visible-corner', 612, 412)], {
      config: wideConeConfig,
    }).targetId).toBe('visible-corner');
  });

  it('treats a negative target radius as zero for visibility', () => {
    expect(resolve([target('invalid-radius', 601, 100, { radius: -5 })], {
      config: { ...config, maxTargetDistance: 600 },
    }).targetId).toBeNull();
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

  it('retains a valid current target independently of the acquisition cone', () => {
    const angle = 30 * Math.PI / 180;
    const retained = target(
      'retained',
      100 + Math.cos(angle) * 200,
      100 + Math.sin(angle) * 200,
    );

    expect(resolve([retained], {
      currentTargetId: retained.id,
      viewDirection: { x: 1, y: 0 },
    }).targetId).toBe(retained.id);
    expect(resolve([retained], { currentTargetId: null }).targetId).toBeNull();
  });

  it('uses the dynamic view direction to acquire a new target', () => {
    const upwardTarget = target('upward', 100, 300);

    expect(resolve([upwardTarget], {
      manualAimDirection: { x: 1, y: 0 },
      viewDirection: { x: 0, y: 1 },
    }).targetId).toBe(upwardTarget.id);
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
    const outsideRange = target('old', 700, 100);
    const replacement = target('new', 250, 100);

    expect(resolve([outsideRange, replacement], { currentTargetId: 'old' }).targetId)
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

  it('locks the first zombie that the assisted hitscan ray can actually hit', () => {
    const scoredTarget = target('far-centered', 300, 100);
    const nearerBlocker = target('near-blocker', 200, 110);
    const result = resolve([scoredTarget, nearerBlocker]);
    const shot = resolveHitscan(
      playerPosition,
      result.finalAimDirection,
      600,
      [scoredTarget, nearerBlocker].map((candidate) => ({
        id: candidate.id,
        position: candidate.position,
        radius: candidate.radius,
      })),
      1,
    );

    expect(result.targetId).toBe('near-blocker');
    expect(shot.hits[0]?.targetId).toBe(result.targetId);
  });

  it('does not lock a farther candidate through a non-candidate blocker', () => {
    const scoredTarget = target('far-centered', 300, 100);
    const outsideConeBlocker = target('outside-cone-blocker', 150, 111);

    expect(resolve([scoredTarget, outsideConeBlocker]).targetId).toBeNull();
  });

  it('does not lock a target behind a hitscan-blocking obstacle', () => {
    const behindObstacle = target('behind-obstacle', 300, 100);

    expect(resolve([behindObstacle], {
      hitscanBlockers: [
        { x: 180, y: 80, width: 40, height: 40, blocksHitscan: true },
      ],
    })).toEqual({
      targetId: null,
      finalAimDirection: { x: 1, y: 0 },
    });
  });

  it('can lock through an obstacle configured as non-blocking', () => {
    const behindObstacle = target('behind-obstacle', 300, 100);

    expect(resolve([behindObstacle], {
      hitscanBlockers: [
        { x: 180, y: 80, width: 40, height: 40, blocksHitscan: false },
      ],
    }).targetId).toBe(behindObstacle.id);
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
