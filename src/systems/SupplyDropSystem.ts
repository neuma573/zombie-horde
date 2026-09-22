import { SUPPLY_DROP_BALANCE, SUPPLY_DROP_CONFIG } from '../config/supplyDropConfig';
import { claimSupplyLoot, revalidatePickupPosition } from '../logic/item';
import type { Position } from '../logic/movement';
import type { RectangleObstacle } from '../logic/obstacleCollision';
import {
  advanceSupplyDrop,
  canOpenSupplyDropCrate,
  createSupplyDropState,
  createSupplyTriggerState,
  damageSupplyDropCrate,
  openSupplyDropCrate,
  resolveSupplyDropCrateBounds,
  resolveSupplyDropSnapshot,
  resolveSupplyTrigger,
  selectSupplyDropLocation,
  type SupplyDropConfig,
  type SupplyTriggerInput,
} from '../logic/supplyDrop';

const CRATE_TARGET_ID = 'supply-drop-crate';

/** Owns the supply lifecycle; the scene creates loot entities and presents snapshots. */
export class SupplyDropSystem {
  private state = createSupplyDropState(SUPPLY_DROP_CONFIG.crateHealth);
  private active = false;
  private lootReleased = false;
  private triggerState = createSupplyTriggerState();
  private config: SupplyDropConfig = SUPPLY_DROP_CONFIG;
  private previousPosition: Position | null = null;

  constructor(private readonly random: () => number = Math.random) {}

  isActive(): boolean {
    return this.active;
  }

  getSnapshot() {
    return resolveSupplyDropSnapshot(this.state, this.config);
  }

  advance(deltaMs: number): void {
    if (this.active) this.state = advanceSupplyDrop(this.state, deltaMs);
  }

  tryTrigger(
    input: Omit<SupplyTriggerInput, 'activeSupply' | 'randomValue'>,
    player: Position,
    bounds: { width: number; height: number },
    obstacles: readonly RectangleObstacle[],
  ): boolean {
    const trigger = resolveSupplyTrigger(this.triggerState, {
      ...input,
      activeSupply: this.active,
      randomValue: this.random(),
    }, SUPPLY_DROP_BALANCE);
    if (!trigger.shouldDrop) {
      this.triggerState = trigger.state;
      return false;
    }
    const target = selectSupplyDropLocation(
      player, bounds, obstacles, this.previousPosition,
      Math.floor(this.random() * 0x1_0000_0000),
      {
        sampleCount: SUPPLY_DROP_BALANCE.locationSampleCount,
        clearance: SUPPLY_DROP_BALANCE.locationClearance,
        normalMinimumPlayerDistance: SUPPLY_DROP_BALANCE.normalMinimumPlayerDistance,
        normalMaximumPlayerDistance: SUPPLY_DROP_BALANCE.normalMaximumPlayerDistance,
        previousDropMinimumDistance: SUPPLY_DROP_BALANCE.previousDropMinimumDistance,
      },
    );
    // A failed placement must not consume the accumulated miss bonus.
    if (!target) return false;
    this.previousPosition = target;
    this.config = { ...SUPPLY_DROP_CONFIG, target };
    this.state = createSupplyDropState(this.config.crateHealth);
    this.lootReleased = false;
    this.active = true;
    this.triggerState = trigger.state;
    return true;
  }

  canOpen(player: Position): boolean {
    return this.active && canOpenSupplyDropCrate(this.getSnapshot(), player, this.config);
  }

  open(player: Position): boolean {
    if (!this.canOpen(player)) return false;
    this.state = openSupplyDropCrate(this.state);
    return true;
  }

  damageCrate(damage: number): { died: boolean } {
    // Pellet targets are captured before damage is applied, so later pellets can
    // still reference a crate whose loot has already been released this shot.
    const result = damageSupplyDropCrate(this.state, damage);
    this.state = result.state;
    return { died: result.died };
  }

  claimLoot(): boolean {
    if (!this.active) return false;
    const claim = claimSupplyLoot(this.lootReleased);
    this.lootReleased = claim.released;
    return claim.shouldDrop;
  }

  completeLootRelease(): void {
    // Keep the opened/destroyed snapshot active until the scene presents it.
    this.active = false;
  }

  revalidateCoordinates(
    bounds: { width: number; height: number },
    obstacles: readonly RectangleObstacle[],
  ): void {
    if (this.active) {
      this.config = {
        ...this.config,
        target: revalidatePickupPosition(
          this.config.target, bounds, obstacles, SUPPLY_DROP_BALANCE.locationClearance,
        ),
      };
    }
    if (this.previousPosition) {
      this.previousPosition = revalidatePickupPosition(
        this.previousPosition, bounds, obstacles, SUPPLY_DROP_BALANCE.locationClearance,
      );
    }
  }

  getCrateTarget() {
    if (!this.active) return null;
    const snapshot = this.getSnapshot();
    if (snapshot.crateDestroyed || snapshot.crateOpened || snapshot.phase !== 'landed') {
      return null;
    }
    return {
      id: CRATE_TARGET_ID,
      position: { ...snapshot.cratePosition },
      width: this.config.crateSize.width,
      height: this.config.crateSize.height,
    };
  }

  isCrateTarget(targetId: string): boolean {
    return targetId === CRATE_TARGET_ID;
  }

  getCrateObstacle() {
    if (!this.active) return null;
    const bounds = resolveSupplyDropCrateBounds(this.getSnapshot(), this.config);
    return bounds ? { ...bounds, blocksHitscan: true as const } : null;
  }
}
