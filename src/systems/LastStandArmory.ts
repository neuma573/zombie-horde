/** Rack selection and the two slots reserved for Last Stand defense. */
export class LastStandArmory {
  private readonly owned = ['pistol'];
  private slots: [string | null, string | null] = [null, null];
  private readonly companionWeapons = new Map<string, string>();
  private readonly deployed = new Set<string>();
  private companionIds = new Set<string>();
  private selectedWeapon: string | null = null;

  getState(): { owned: string[]; slots: [string | null, string | null]; selectedWeapon: string | null } {
    return { owned: [...this.owned], slots: [...this.slots], selectedWeapon: this.selectedWeapon };
  }

  selectWeapon(weaponId: string): boolean {
    if (!this.owned.includes(weaponId) || this.isAssigned(weaponId)) return false;
    this.selectedWeapon = weaponId;
    return true;
  }

  clickSlot(slot: 0 | 1): boolean {
    if (this.slots[slot]) {
      this.slots[slot] = null;
      return true;
    }
    if (!this.selectedWeapon || this.isAssigned(this.selectedWeapon)) return false;
    this.slots[slot] = this.selectedWeapon;
    this.selectedWeapon = null;
    return true;
  }

  addWeapon(id: string): void {
    if (['pistol', 'burstRifle', 'doubleBarrelShotgun', 'policeBaton'].includes(id) && !this.owned.includes(id)) this.owned.push(id);
  }

  syncCompanions(ids: readonly string[]): void {
    this.companionIds = new Set(ids);
    for (const id of this.companionWeapons.keys()) if (!this.companionIds.has(id)) this.companionWeapons.delete(id);
    for (const id of this.deployed) if (!this.companionIds.has(id)) this.deployed.delete(id);
  }

  isAssigned(weaponId: string): boolean {
    return this.slots.includes(weaponId) || [...this.companionWeapons.values()].includes(weaponId);
  }

  getCompanionWeapon(id: string): string | null { return this.companionWeapons.get(id) ?? null; }
  getDeployedIds(): string[] { return [...this.deployed]; }

  assignCompanion(id: string, weaponId: string | null): boolean {
    if (!this.companionIds.has(id)) return false;
    if (weaponId === null) { this.companionWeapons.delete(id); return true; }
    if (!this.owned.includes(weaponId) || this.isAssigned(weaponId)) return false;
    this.companionWeapons.set(id, weaponId);
    if (this.selectedWeapon === weaponId) this.selectedWeapon = null;
    return true;
  }

  toggleDeployment(id: string, availableAmmo: number): boolean {
    if (!this.companionIds.has(id)) return false;
    if (this.deployed.has(id)) { this.deployed.delete(id); return true; }
    if (!Number.isFinite(availableAmmo) || this.deployed.size >= Math.floor(availableAmmo)) return false;
    this.deployed.add(id);
    return true;
  }

  canStartDefense(): boolean { return this.slots.some(id => id !== null); }
}
