import { resolveAimDirection } from './aim';
import { resolveHitscan, type HitscanTarget, type Vector2 } from './hitscan';

export type AimSource = 'none' | 'mouse' | 'mobile';

export interface AimAssistConfig {
  acquisitionHalfAngleRadians: number;
  retentionHalfAngleRadians: number;
  maxTargetDistance: number;
  viewportMargin: number;
  angleWeight: number;
  distanceWeight: number;
  switchPenalty: number;
}

export interface AimAssistTarget {
  id: string;
  position: Vector2;
  radius: number;
  health: number;
  active: boolean;
}

export interface WorldView {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface AimAssistInput {
  enabled: boolean;
  playerPosition: Vector2;
  manualAimDirection: Vector2;
  currentTargetId: string | null;
  targets: readonly AimAssistTarget[];
  worldView: WorldView;
  hitscanRange: number;
  config: AimAssistConfig;
}

export interface AimAssistResult {
  targetId: string | null;
  finalAimDirection: Vector2;
}

interface Candidate {
  target: AimAssistTarget;
  angleError: number;
  distance: number;
  isCurrent: boolean;
}

const EPSILON = 1e-8;

export function shouldApplyMobileAimAssist(
  mobileControlsEnabled: boolean,
  aimSource: AimSource,
): boolean {
  return mobileControlsEnabled && aimSource === 'mobile';
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function circleIntersectsWorldView(
  target: AimAssistTarget,
  worldView: WorldView,
  margin: number,
): boolean {
  const safeMargin = Math.max(0, margin);
  const left = worldView.x - safeMargin;
  const right = worldView.x + Math.max(0, worldView.width) + safeMargin;
  const top = worldView.y - safeMargin;
  const bottom = worldView.y + Math.max(0, worldView.height) + safeMargin;
  const radius = Math.max(0, target.radius);
  const closestX = clamp(target.position.x, left, right);
  const closestY = clamp(target.position.y, top, bottom);
  const offsetX = target.position.x - closestX;
  const offsetY = target.position.y - closestY;

  return offsetX * offsetX + offsetY * offsetY <= radius * radius;
}

function createCandidate(
  target: AimAssistTarget,
  input: AimAssistInput,
  manualAimDirection: Vector2,
): Candidate | null {
  if (!target.active || target.health <= 0) return null;
  if (!circleIntersectsWorldView(target, input.worldView, input.config.viewportMargin)) return null;

  const offsetX = target.position.x - input.playerPosition.x;
  const offsetY = target.position.y - input.playerPosition.y;
  const distance = Math.hypot(offsetX, offsetY);

  if (distance < EPSILON || distance > Math.max(0, input.config.maxTargetDistance)) return null;

  const direction = { x: offsetX / distance, y: offsetY / distance };
  const dot = clamp(
    manualAimDirection.x * direction.x + manualAimDirection.y * direction.y,
    -1,
    1,
  );
  const angleError = Math.acos(dot);
  const isCurrent = target.id === input.currentTargetId;
  const halfAngle = isCurrent
    ? Math.max(0, input.config.retentionHalfAngleRadians)
    : Math.max(0, input.config.acquisitionHalfAngleRadians);

  return angleError <= halfAngle ? { target, angleError, distance, isCurrent } : null;
}

function scoreCandidate(
  candidate: Candidate,
  config: AimAssistConfig,
  retainedCurrentTarget: boolean,
): number {
  const maxDistance = Math.max(EPSILON, config.maxTargetDistance);
  const switchCost = retainedCurrentTarget && !candidate.isCurrent
    ? Math.max(0, config.switchPenalty)
    : 0;

  return candidate.angleError * Math.max(0, config.angleWeight)
    + candidate.distance / maxDistance * Math.max(0, config.distanceWeight)
    + switchCost;
}

function isFirstHitscanTarget(
  candidate: Candidate,
  input: AimAssistInput,
  manualAimDirection: Vector2,
  hitscanTargets: readonly HitscanTarget[],
): boolean {
  const direction = resolveAimDirection(
    {
      x: candidate.target.position.x - input.playerPosition.x,
      y: candidate.target.position.y - input.playerPosition.y,
    },
    manualAimDirection,
  );
  const firstHit = resolveHitscan(
    input.playerPosition,
    direction,
    input.hitscanRange,
    hitscanTargets,
    1,
  ).hits[0];

  return firstHit?.targetId === candidate.target.id;
}

export function resolveAimAssist(input: AimAssistInput): AimAssistResult {
  const manualAimDirection = resolveAimDirection(input.manualAimDirection, { x: 1, y: 0 });

  if (!input.enabled || input.config.maxTargetDistance <= 0) {
    return { targetId: null, finalAimDirection: manualAimDirection };
  }

  const candidates = input.targets.flatMap<Candidate>((target) => {
    const candidate = createCandidate(target, input, manualAimDirection);
    return candidate ? [candidate] : [];
  });
  const retainedCurrentTarget = candidates.some((candidate) => candidate.isCurrent);

  candidates.sort((left, right) => {
    const scoreDifference = scoreCandidate(left, input.config, retainedCurrentTarget)
      - scoreCandidate(right, input.config, retainedCurrentTarget);

    if (Math.abs(scoreDifference) > EPSILON) return scoreDifference;
    return left.target.id < right.target.id ? -1 : Number(left.target.id > right.target.id);
  });

  const hitscanTargets = input.targets.flatMap<HitscanTarget>((target) => (
    target.active && target.health > 0
      ? [{ id: target.id, position: target.position, radius: target.radius }]
      : []
  ));

  const selected = candidates.find((candidate) => (
    isFirstHitscanTarget(candidate, input, manualAimDirection, hitscanTargets)
  ))?.target;

  if (!selected) {
    return { targetId: null, finalAimDirection: manualAimDirection };
  }

  return {
    targetId: selected.id,
    finalAimDirection: resolveAimDirection(
      {
        x: selected.position.x - input.playerPosition.x,
        y: selected.position.y - input.playerPosition.y,
      },
      manualAimDirection,
    ),
  };
}
