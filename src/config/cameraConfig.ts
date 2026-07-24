import { PLAYER_CONFIG } from './playerConfig';

export const CAMERA_ZOOM_CONFIG = {
  min: 0.75,
  max: 1.5,
  initial: 1,
  wheelStep: 0.1,
  smoothSpeed: 12,
  snapThreshold: 0.001,
  pinchThresholdPixels: 6,
  pinchSensitivity: 0.6,
} as const;

export const CAMERA_FOLLOW_CONFIG = {
  followSpeed: 8,
  lookAheadSpeed: 10,
  lookAheadDistance: 32,
  movementSpeedThreshold: 8,
  maximumPlayerSpeed: PLAYER_CONFIG.speed,
  snapThreshold: 0.01,
} as const;
