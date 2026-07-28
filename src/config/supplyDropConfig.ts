import type { SupplyDropConfig } from '../logic/supplyDrop';

export const SUPPLY_DROP_CONFIG = {
  target: { x: 1_180, y: 2_180 },
  announcementDurationMs: 2_000,
  flyoverDurationMs: 2_800,
  dropDelayMs: 900,
  fallDurationMs: 1_100,
  planeTravel: { x: 1_600, y: 900 },
  fallHeight: 180,
  indicatorMargin: 46,
  crateHealth: 90,
  crateSize: { width: 52, height: 42 },
  interactionRange: 86,
} as const satisfies SupplyDropConfig;
