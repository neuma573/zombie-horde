import type { Vector2 } from './hitscan';

export interface ShotEffectEvent {
  origin: Vector2;
  endPoint: Vector2;
}

export interface ImpactEffectEvent {
  position: Vector2;
  radius: number;
}
