import type { SupplyDropSnapshot } from './supplyDrop';

export function resolveSupplyDropFeedback(
  snapshot: Pick<SupplyDropSnapshot, 'phase' | 'crateOpened' | 'crateDestroyed'>,
): { planeLabel: string | null; crateLabel: string | null } {
  if (snapshot.crateOpened || snapshot.crateDestroyed) {
    return { planeLabel: null, crateLabel: null };
  }
  switch (snapshot.phase) {
    case 'announced': return { planeLabel: 'SUPPLY PLANE\nINCOMING', crateLabel: null };
    case 'flyover': return { planeLabel: 'SUPPLY PLANE\nFLYING OVER', crateLabel: null };
    case 'drop-pending': return { planeLabel: 'SUPPLY DROP\nPREPARING', crateLabel: null };
    case 'falling': return { planeLabel: null, crateLabel: 'SUPPLY CRATE\nDESCENDING' };
    case 'landed': return { planeLabel: null, crateLabel: 'SUPPLY CRATE\nLANDED' };
  }
}

export function resolveOffscreenSupplyDropFeedback(
  snapshot: Pick<SupplyDropSnapshot, 'phase' | 'crateOpened' | 'crateDestroyed'>,
  offscreen: { plane: boolean; crate: boolean },
): { planeLabel: string | null; crateLabel: string | null } {
  const feedback = resolveSupplyDropFeedback(snapshot);
  return {
    planeLabel: offscreen.plane ? feedback.planeLabel : null,
    crateLabel: offscreen.crate ? feedback.crateLabel : null,
  };
}
