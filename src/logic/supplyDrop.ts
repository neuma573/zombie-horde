import type { Position } from './movement';

export interface SupplyDropConfig {
  target: Position;
  announcementDurationMs: number;
  flyoverDurationMs: number;
  dropDelayMs: number;
  fallDurationMs: number;
  planeTravel: Position;
  fallHeight: number;
  indicatorMargin: number;
  crateHealth: number;
  crateSize: { width: number; height: number };
  interactionRange: number;
}

export type SupplyDropPhase =
  | 'announced'
  | 'flyover'
  | 'drop-pending'
  | 'falling'
  | 'landed';

export interface SupplyDropState {
  elapsedMs: number;
  crateHealth: number;
  crateOpened: boolean;
}

export interface SupplyDropSnapshot {
  phase: SupplyDropPhase;
  target: Position;
  planePosition: Position;
  planeRotation: number;
  planeProgress: number;
  cratePosition: Position;
  fallProgress: number;
  smokeElapsedMs: number;
  crateDestroyed: boolean;
  crateOpened: boolean;
}

export interface SupplyDropIndicator {
  visible: boolean;
  position: Position;
  rotation: number;
}

export interface SupplyDropCrateBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

export function createSupplyDropState(crateHealth = 100): SupplyDropState {
  return {
    elapsedMs: 0,
    crateHealth: Math.max(0, finite(crateHealth)),
    crateOpened: false,
  };
}

export function advanceSupplyDrop(
  state: SupplyDropState,
  deltaMs: number,
): SupplyDropState {
  const safeDeltaMs = Number.isFinite(deltaMs) ? Math.max(0, deltaMs) : 0;
  return {
    elapsedMs: state.elapsedMs + safeDeltaMs,
    crateHealth: state.crateHealth,
    crateOpened: state.crateOpened,
  };
}

export function damageSupplyDropCrate(
  state: SupplyDropState,
  damage: number,
): { state: SupplyDropState; died: boolean } {
  const wasAlive = state.crateHealth > 0;
  const crateHealth = Math.max(
    0,
    state.crateHealth - Math.max(0, finite(damage)),
  );

  return {
    state: {
      ...state,
      crateHealth,
      crateOpened: state.crateOpened || (wasAlive && crateHealth === 0),
    },
    died: wasAlive && crateHealth === 0,
  };
}

export function resolveSupplyDropSnapshot(
  state: SupplyDropState,
  config: SupplyDropConfig,
): SupplyDropSnapshot {
  const announcementEnd = duration(config.announcementDurationMs);
  const flyoverEnd = announcementEnd + duration(config.flyoverDurationMs);
  const pendingEnd = flyoverEnd + duration(config.dropDelayMs);
  const fallingEnd = pendingEnd + duration(config.fallDurationMs);
  const elapsedMs = Math.max(0, finite(state.elapsedMs));
  const planeProgress = progress(
    elapsedMs,
    announcementEnd,
    flyoverEnd,
  );
  const fallProgress = progress(elapsedMs, pendingEnd, fallingEnd);
  const travelX = finite(config.planeTravel.x);
  const travelY = finite(config.planeTravel.y);
  const target = {
    x: finite(config.target.x),
    y: finite(config.target.y),
  };

  return {
    phase: elapsedMs < announcementEnd
      ? 'announced'
      : elapsedMs < flyoverEnd
        ? 'flyover'
        : elapsedMs < pendingEnd
          ? 'drop-pending'
          : elapsedMs < fallingEnd
            ? 'falling'
            : 'landed',
    target,
    planePosition: {
      x: target.x + (planeProgress - 0.5) * travelX,
      y: target.y + (planeProgress - 0.5) * travelY,
    },
    planeRotation: Math.atan2(travelY, travelX),
    planeProgress,
    cratePosition: {
      x: target.x,
      y: target.y - Math.max(0, finite(config.fallHeight)) * (1 - fallProgress),
    },
    fallProgress,
    smokeElapsedMs: Math.max(0, elapsedMs - fallingEnd),
    crateDestroyed: state.crateHealth <= 0,
    crateOpened: state.crateOpened,
  };
}

export function resolveSupplyDropIndicator(
  targetScreen: Position,
  viewport: { width: number; height: number },
  margin: number,
): SupplyDropIndicator {
  const width = Math.max(0, finite(viewport.width));
  const height = Math.max(0, finite(viewport.height));
  const safeMargin = Math.max(0, Math.min(
    finite(margin),
    width / 2,
    height / 2,
  ));
  const x = finite(targetScreen.x);
  const y = finite(targetScreen.y);
  const visible = (
    x < safeMargin
    || x > width - safeMargin
    || y < safeMargin
    || y > height - safeMargin
  );
  const center = { x: width / 2, y: height / 2 };

  return {
    visible,
    position: {
      x: Math.min(width - safeMargin, Math.max(safeMargin, x)),
      y: Math.min(height - safeMargin, Math.max(safeMargin, y)),
    },
    rotation: Math.atan2(y - center.y, x - center.x),
  };
}

export function resolveSupplyDropCrateBounds(
  snapshot: SupplyDropSnapshot,
  config: SupplyDropConfig,
): SupplyDropCrateBounds | null {
  if (
    snapshot.phase !== 'landed'
    || snapshot.crateDestroyed
    || snapshot.crateOpened
  ) {
    return null;
  }

  const width = Math.max(0, finite(config.crateSize.width));
  const height = Math.max(0, finite(config.crateSize.height));
  return {
    x: snapshot.target.x - width / 2,
    y: snapshot.target.y - height / 2,
    width,
    height,
  };
}

export function canOpenSupplyDropCrate(
  snapshot: SupplyDropSnapshot,
  player: Position,
  config: SupplyDropConfig,
): boolean {
  if (
    snapshot.phase !== 'landed'
    || snapshot.crateOpened
    || snapshot.crateDestroyed
  ) {
    return false;
  }

  return Math.hypot(
    finite(player.x) - snapshot.target.x,
    finite(player.y) - snapshot.target.y,
  ) <= Math.max(0, finite(config.interactionRange));
}

export function openSupplyDropCrate(
  state: SupplyDropState,
): SupplyDropState {
  if (state.crateHealth <= 0) return state;
  return { ...state, crateOpened: true };
}

function progress(value: number, start: number, end: number): number {
  if (end <= start) return value >= end ? 1 : 0;
  return Math.min(1, Math.max(0, (value - start) / (end - start)));
}

function duration(value: number): number {
  return Math.max(0, finite(value));
}

function finite(value: number): number {
  return Number.isFinite(value) ? value : 0;
}
