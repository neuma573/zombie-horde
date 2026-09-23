import type { ZombieConfig } from '../config/zombieConfig';
import type { Position } from './movement';
import { fastZombieSpeedMultiplier } from './fastZombie';
import { zombieAppearanceSeedFromId } from './zombieAppearance';
import { moveZombieWithCrowdSpacing, zombieVelocityWithCrowdSpacing } from './zombieCrowdSpacing';

/** Shared pursuit step for Horde and defense. Collision and knockback remain separate. */
export function movePursuingZombie(
  zombie: { id: string; kind: 'normal' | 'fast'; position: Position },
  target: Position,
  separationVelocity: Position,
  deltaMs: number,
  config: Pick<ZombieConfig, 'speed' | 'fast'>,
  speedOverride?: number,
): Position {
  const speed = speedOverride ?? config.speed * (zombie.kind === 'fast'
    ? fastZombieSpeedMultiplier(zombieAppearanceSeedFromId(zombie.id), config.fast)
    : 1);
  const velocity = zombieVelocityWithCrowdSpacing(zombie.position, target, speed, separationVelocity);
  return moveZombieWithCrowdSpacing(zombie.position, target, velocity, deltaMs);
}
