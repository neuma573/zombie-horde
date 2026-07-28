import {
  advanceWeapon,
  createOwnedWeapon,
  createWeaponInventory,
  getReloadProgress,
  pickupOwnedWeapon,
  selectWeaponSlot,
  startReload,
  tryFire,
  type AmmoType,
  type OwnedWeapon,
  type ReloadProgress,
  type WeaponDefinition,
  type WeaponInventoryState,
  type WeaponState,
} from '../logic/weapon';

export class WeaponSystem {
  private inventory: WeaponInventoryState;
  private readonly ammoReserves: Record<AmmoType, number>;
  private burstShotsRemaining = 0;
  private burstTimerMs = 0;

  constructor(
    startingWeapon: WeaponDefinition,
    initialAmmoReserves?: Partial<Record<AmmoType, number>>,
  ) {
    this.inventory = createWeaponInventory(startingWeapon);
    this.ammoReserves = {
      pistolAmmo: Math.max(0, initialAmmoReserves?.pistolAmmo ?? (
        startingWeapon.ammoType === 'pistolAmmo' ? startingWeapon.config.reserveAmmo : 0
      )),
      rifleAmmo: Math.max(0, initialAmmoReserves?.rifleAmmo ?? (
        startingWeapon.ammoType === 'rifleAmmo' ? startingWeapon.config.reserveAmmo : 0
      )),
    };
    this.syncActiveReserve();
  }

  update(deltaMs: number): number {
    let remainingMs = Math.max(0, deltaMs);
    let fired = 0;
    const interval = this.getDefinition().config.burstIntervalMs ?? 0;

    while (
      this.burstShotsRemaining > 0
      && remainingMs >= this.burstTimerMs
    ) {
      const elapsedBeforeShot = Math.max(0, this.burstTimerMs);
      this.advanceWeaponsBy(elapsedBeforeShot);
      remainingMs -= elapsedBeforeShot;
      this.burstTimerMs = 0;

      if (!this.fireRound(true)) {
        this.cancelBurst();
        break;
      }
      fired += 1;
      this.burstShotsRemaining -= 1;
      this.burstTimerMs = interval;
    }

    this.advanceWeaponsBy(remainingMs);
    this.burstTimerMs = Math.max(0, this.burstTimerMs - remainingMs);
    const active = this.getOwnedWeapon();
    this.ammoReserves[active.definition.ammoType] = active.state.reserveAmmo;
    return fired;
  }

  fire(): boolean {
    if (this.burstShotsRemaining > 0) return false;
    const fired = this.fireRound(false);
    if (!fired) return false;

    const config = this.getDefinition().config;
    this.burstShotsRemaining = Math.max(0, (config.burstSize ?? 1) - 1);
    this.burstTimerMs = config.burstIntervalMs ?? 0;
    return true;
  }

  reload(): void {
    this.cancelBurst();
    this.updateActiveState(startReload(this.getState(), this.getDefinition().config));
  }

  selectSlot(slot: 0 | 1): void {
    if (slot === this.inventory.activeSlot || this.inventory.slots[slot] === null) {
      return;
    }
    this.cancelActiveReload();
    const next = selectWeaponSlot(this.inventory, slot);
    if (next !== this.inventory) {
      this.cancelBurst();
      this.inventory = next;
      this.syncActiveReserve();
    }
  }

  pickup(definition: WeaponDefinition): OwnedWeapon | null {
    return this.pickupOwned(createOwnedWeapon(definition));
  }

  pickupOwned(ownedWeapon: OwnedWeapon): OwnedWeapon | null {
    this.cancelBurst();
    this.cancelActiveReload();
    const normalizedWeapon: OwnedWeapon = {
      ...ownedWeapon,
      state: {
        ...ownedWeapon.state,
        reserveAmmo: this.ammoReserves[ownedWeapon.definition.ammoType],
        reloadRemainingMs: null,
      },
    };
    const result = pickupOwnedWeapon(this.inventory, normalizedWeapon);
    this.inventory = result.state;
    this.syncActiveReserve();
    return result.replaced ? {
      ...result.replaced,
      state: {
        ...result.replaced.state,
        reserveAmmo: 0,
        reloadRemainingMs: null,
      },
    } : null;
  }

  getState(): Readonly<WeaponState> {
    return this.getOwnedWeapon().state;
  }

  getReloadProgress(): ReloadProgress {
    return getReloadProgress(this.getState(), this.getDefinition().config);
  }

  getDefinition(): WeaponDefinition {
    return this.getOwnedWeapon().definition;
  }

  getInventory(): Readonly<WeaponInventoryState> {
    return this.inventory;
  }

  getAmmoReserves(): Readonly<Record<AmmoType, number>> {
    return this.ammoReserves;
  }

  addReserveAmmo(ammoType: AmmoType, amount: number): number {
    const previous = this.ammoReserves[ammoType];
    const granted = Number.isFinite(amount) ? Math.max(0, amount) : 0;
    const next = previous + granted;
    this.ammoReserves[ammoType] = next;
    if (this.getDefinition().ammoType === ammoType) {
      this.updateActiveState({ ...this.getState(), reserveAmmo: next });
    }
    return granted;
  }

  private fireRound(ignoreCooldown: boolean): boolean {
    const owned = this.getOwnedWeapon();
    const state = ignoreCooldown
      ? { ...owned.state, cooldownRemainingMs: 0 }
      : owned.state;
    const result = tryFire(state, owned.definition.config);
    if (result.fired) this.updateActiveState(result.state);
    return result.fired;
  }

  private getOwnedWeapon(): OwnedWeapon {
    const owned = this.inventory.slots[this.inventory.activeSlot];
    if (!owned) throw new Error('Active weapon slot cannot be empty');
    return owned;
  }

  private updateActiveState(state: WeaponState): void {
    const slots: WeaponInventoryState['slots'] = [...this.inventory.slots];
    slots[this.inventory.activeSlot] = {
      ...this.getOwnedWeapon(),
      state,
    };
    this.inventory = { ...this.inventory, slots };
    this.ammoReserves[this.getDefinition().ammoType] = state.reserveAmmo;
  }

  private advanceWeaponsBy(elapsedMs: number): void {
    this.inventory = {
      ...this.inventory,
      slots: this.inventory.slots.map((owned, slot) => {
        if (!owned) return null;
        if (slot === this.inventory.activeSlot) {
          return {
            ...owned,
            state: advanceWeapon(owned.state, owned.definition.config, elapsedMs),
          };
        }

        const cooldownOnlyState = advanceWeapon(
          { ...owned.state, reloadRemainingMs: null },
          owned.definition.config,
          elapsedMs,
        );
        return {
          ...owned,
          state: {
            ...cooldownOnlyState,
            reserveAmmo: 0,
            reloadRemainingMs: null,
          },
        };
      }) as WeaponInventoryState['slots'],
    };
  }

  private cancelActiveReload(): void {
    const owned = this.getOwnedWeapon();
    if (owned.state.reloadRemainingMs === null) return;
    this.updateActiveState({ ...owned.state, reloadRemainingMs: null });
  }

  private syncActiveReserve(): void {
    const owned = this.getOwnedWeapon();
    this.updateActiveState({
      ...owned.state,
      reserveAmmo: this.ammoReserves[owned.definition.ammoType],
      reloadRemainingMs: null,
    });
  }

  private cancelBurst(): void {
    this.burstShotsRemaining = 0;
    this.burstTimerMs = 0;
  }
}
