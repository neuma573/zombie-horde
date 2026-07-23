import { describe, expect, it } from 'vitest';

import { SIMULATION_CONFIG } from '../config/simulationConfig';
import { consumeFixedSteps, createFixedStepState } from '../logic/fixedStep';
import {
  moveZombieWithCrowdSpacing,
  resolveZombieCrowdSpacing,
  zombieVelocityWithCrowdSpacing,
} from '../logic/zombieCrowdSpacing';
import { queryZombieCollisionCandidates, type ZombieSpatialEntry } from '../logic/zombieSpatialGrid';

function consumePartition(partition: readonly number[]) {
  let state = createFixedStepState();
  let steps = 0;

  for (const deltaMs of partition) {
    const consumption = consumeFixedSteps(state, deltaMs, SIMULATION_CONFIG.fixedStepMs);
    state = consumption.state;
    steps += consumption.stepCount;
  }

  return { state, steps };
}

function simulateCrowd(partition: readonly number[]) {
  let fixedStepState = createFixedStepState();
  let entries: ZombieSpatialEntry[] = [
    { id: 'a', position: { x: 0, y: 0 }, radius: 20 },
    { id: 'b', position: { x: 10, y: 0 }, radius: 20 },
  ];
  const target = { x: 10_000, y: 0 };

  for (const deltaMs of partition) {
    const consumption = consumeFixedSteps(
      fixedStepState,
      deltaMs,
      SIMULATION_CONFIG.fixedStepMs,
    );
    fixedStepState = consumption.state;

    for (let step = 0; step < consumption.stepCount; step += 1) {
      const spacing = resolveZombieCrowdSpacing(
        entries,
        queryZombieCollisionCandidates(entries),
        { minimumDistanceRatio: 0.9, maximumSeparationSpeed: 36 },
        80,
      );
      entries = entries.map((entry) => {
        const velocity = zombieVelocityWithCrowdSpacing(
          entry.position,
          target,
          80,
          spacing.velocities.get(entry.id) ?? { x: 0, y: 0 },
        );
        return {
          ...entry,
          position: moveZombieWithCrowdSpacing(
            entry.position,
            target,
            velocity,
            SIMULATION_CONFIG.fixedStepMs,
          ),
        };
      });
    }
  }

  return { entries, fixedStepState };
}

describe('fixed simulation step', () => {
  it('consumes the same steps and remainder for equivalent delta partitions', () => {
    const expected = consumePartition([1_000]);

    expect(consumePartition([500, 500])).toEqual(expected);
    expect(consumePartition(Array(10).fill(100))).toEqual(expected);
    expect(consumePartition([17, 83, 211, 9, 337, 343])).toEqual(expected);
  });

  it('keeps crowd spacing identical across render delta partitions', () => {
    const expected = simulateCrowd([1_000]);

    expect(simulateCrowd([500, 500])).toEqual(expected);
    expect(simulateCrowd(Array(10).fill(100))).toEqual(expected);
    expect(simulateCrowd([17, 83, 211, 9, 337, 343])).toEqual(expected);
  });

  it('ignores invalid elapsed time without producing invalid state', () => {
    expect(consumeFixedSteps(
      { accumulatorMs: Number.NaN },
      Number.POSITIVE_INFINITY,
      SIMULATION_CONFIG.fixedStepMs,
    )).toEqual({ state: { accumulatorMs: 0 }, stepCount: 0 });
    expect(consumeFixedSteps(createFixedStepState(), 100, 0))
      .toEqual({ state: { accumulatorMs: 0 }, stepCount: 0 });
  });
});
