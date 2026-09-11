import type { Vector2 } from '../logic/hitscan';
import type { PlayerAction, PlayerActionQueue } from './PlayerActionQueue';

export interface PlayerActionHandlers {
  fire(aimDirection: Vector2): void;
  reload(): void;
  selectWeaponSlot(slot: 0 | 1): void;
  shove(aimDirection: Vector2): void;
  pickupWeapon(pickupId: number): void;
  openSupplyCrate(): void;
}

export function dispatchPlayerActionsThrough(
  queue: PlayerActionQueue,
  simulationBoundaryMs: number,
  handlers: PlayerActionHandlers,
  canContinue: () => boolean = () => true,
): void {
  while (canContinue()) {
    const queued = queue.consumeThrough(simulationBoundaryMs);
    if (!queued) return;
    dispatchPlayerAction(queued.action, handlers);
  }
}

function dispatchPlayerAction(
  action: PlayerAction,
  handlers: PlayerActionHandlers,
): void {
  switch (action.type) {
    case 'fire':
      handlers.fire(action.aimDirection);
      return;
    case 'reload':
      handlers.reload();
      return;
    case 'selectWeaponSlot':
      handlers.selectWeaponSlot(action.slot);
      return;
    case 'shove':
      handlers.shove(action.aimDirection);
      return;
    case 'pickupWeapon':
      handlers.pickupWeapon(action.pickupId);
      return;
    case 'openSupplyCrate':
      handlers.openSupplyCrate();
  }
}
