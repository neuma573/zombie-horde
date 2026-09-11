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
