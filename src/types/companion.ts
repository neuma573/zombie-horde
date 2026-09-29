import type { WeaponId } from '../logic/weapon';

export interface Companion {
  id: string;
  gender: 'male' | 'female';
  firstName: string;
  lastName: string;
  courage: number;
  joinedDay: number;
  status: 'active' | 'dead';
}
export interface CompanionEvent {
  type: 'joined' | 'died';
  companion: Companion;
  locationId: string;
}
export interface CompanionDeployment {
  companion: Companion;
  /** Null means the companion's personal, weak pistol. */
  weaponId: WeaponId | null;
}
