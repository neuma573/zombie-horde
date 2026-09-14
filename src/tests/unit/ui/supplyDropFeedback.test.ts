import { describe, expect, it } from 'vitest';
import { resolveOffscreenSupplyDropFeedback, resolveSupplyDropFeedback } from '../../../logic/supplyDropFeedback';
import type { SupplyDropPhase } from '../../../logic/supplyDrop';

describe('supply drop feedback', () => {
  it.each([
    ['announced', 'SUPPLY PLANE\nINCOMING'],
    ['flyover', 'SUPPLY PLANE\nFLYING OVER'],
    ['drop-pending', 'SUPPLY DROP\nPREPARING'],
  ] as const)('identifies the aircraft event during %s', (phase, planeLabel) => {
    expect(resolveSupplyDropFeedback({ phase, crateOpened: false, crateDestroyed: false }))
      .toEqual({ planeLabel, crateLabel: null });
  });
  it.each([
    ['falling', 'SUPPLY CRATE\nDESCENDING'],
    ['landed', 'SUPPLY CRATE\nLANDED'],
  ] as const)('directs attention to the crate during %s', (phase, crateLabel) => {
    expect(resolveSupplyDropFeedback({ phase, crateOpened: false, crateDestroyed: false }))
      .toEqual({ planeLabel: null, crateLabel });
  });
  it.each(['announced', 'flyover', 'drop-pending', 'falling', 'landed'] as SupplyDropPhase[])(
    'removes collected or destroyed supply feedback during %s', (phase) => {
      expect(resolveSupplyDropFeedback({ phase, crateOpened: true, crateDestroyed: false }))
        .toEqual({ planeLabel: null, crateLabel: null });
      expect(resolveSupplyDropFeedback({ phase, crateOpened: false, crateDestroyed: true }))
        .toEqual({ planeLabel: null, crateLabel: null });
    },
  );
});

describe('offscreen supply drop feedback', () => {
  it.each(['announced', 'flyover', 'drop-pending', 'falling', 'landed'] as SupplyDropPhase[])(
    'hides labels for onscreen objects during %s', (phase) => {
      expect(resolveOffscreenSupplyDropFeedback(
        { phase, crateOpened: false, crateDestroyed: false },
        { plane: false, crate: false },
      )).toEqual({ planeLabel: null, crateLabel: null });
    },
  );

  it.each(['announced', 'flyover', 'drop-pending'] as SupplyDropPhase[])(
    'hides the offscreen crate before it appears during %s', (phase) => {
      expect(resolveOffscreenSupplyDropFeedback(
        { phase, crateOpened: false, crateDestroyed: false },
        { plane: false, crate: true },
      )).toEqual({ planeLabel: null, crateLabel: null });
    },
  );

  it('shows the aircraft label only offscreen', () => {
    expect(resolveOffscreenSupplyDropFeedback(
      { phase: 'flyover', crateOpened: false, crateDestroyed: false },
      { plane: true, crate: false },
    )).toEqual({ planeLabel: 'SUPPLY PLANE\nFLYING OVER', crateLabel: null });
  });

  it.each(['falling', 'landed'] as const)('shows the visible offscreen crate during %s', (phase) => {
    expect(resolveOffscreenSupplyDropFeedback(
      { phase, crateOpened: false, crateDestroyed: false },
      { plane: false, crate: true },
    )).toEqual({ planeLabel: null, crateLabel: phase === 'falling'
      ? 'SUPPLY CRATE\nDESCENDING' : 'SUPPLY CRATE\nLANDED' });
  });
});
