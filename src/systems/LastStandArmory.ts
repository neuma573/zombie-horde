/** Rack selection and the two slots reserved for Last Stand defense. */
export class LastStandArmory {
  private readonly owned = ['pistol'];
  private slots: [string | null, string | null] = [null, null];
  private selectedWeapon: string | null = null;

  getState(): { owned: string[]; slots: [string | null, string | null]; selectedWeapon: string | null } {
    return { owned: [...this.owned], slots: [...this.slots], selectedWeapon: this.selectedWeapon };
  }

  selectWeapon(weaponId: string): boolean {
    if (!this.owned.includes(weaponId) || this.slots.includes(weaponId)) return false;
    this.selectedWeapon = weaponId;
    return true;
  }

  clickSlot(slot: 0 | 1): boolean {
    if (this.slots[slot]) {
      this.slots[slot] = null;
      return true;
    }
    if (!this.selectedWeapon || this.slots.includes(this.selectedWeapon)) return false;
    this.slots[slot] = this.selectedWeapon;
    this.selectedWeapon = null;
    return true;
  }

  canStartDefense(): boolean { return this.slots.some(id => id !== null); }
}
