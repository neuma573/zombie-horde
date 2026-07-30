import { describe, expect, it } from 'vitest';

import { BURST_RIFLE_WEAPON, PISTOL_WEAPON, STARTING_AMMO_RESERVES } from '../../config/weaponConfig';
import { ZOMBIE_CONFIG } from '../../config/zombieConfig';
import { applyDamage } from '../../logic/damage';
import { WeaponSystem } from '../../systems/WeaponSystem';

describe('weapon balance', () => {
  it('starts the service pistol with 17 loaded rounds and 100 reserve rounds', () => {
    const system = new WeaponSystem(PISTOL_WEAPON, STARTING_AMMO_RESERVES);

    expect(system.getState()).toMatchObject({
      magazineAmmo: 17,
      reserveAmmo: 100,
    });
    expect(system.getAmmoReserves().pistolAmmo).toBe(100);
    expect(system.getAmmoReserves().rifleAmmo).toBe(0);
  });

  it('requires four pistol body shots to kill the base zombie', () => {
    let health: number = ZOMBIE_CONFIG.health;

    for (let shot = 0; shot < 3; shot += 1) {
      const result = applyDamage(health, PISTOL_WEAPON.config.damage);
      health = result.health;
      expect(result.died).toBe(false);
    }

    const fourthShot = applyDamage(health, PISTOL_WEAPON.config.damage);
    expect(health).toBe(13);
    expect(fourthShot).toEqual({ health: 0, died: true });
  });

  it('uses the increased pistol fire rate', () => {
    expect(PISTOL_WEAPON.config.fireIntervalMs).toBe(150);
  });

  it('uses doubled ranges and a faster, harder-kicking rifle burst', () => {
    expect(PISTOL_WEAPON.config.range).toBe(1_200);
    expect(BURST_RIFLE_WEAPON.config.range).toBe(1_520);
    expect(BURST_RIFLE_WEAPON.config.fireIntervalMs).toBe(220);
    expect(BURST_RIFLE_WEAPON.config.burstIntervalMs).toBe(65);
    expect(BURST_RIFLE_WEAPON.recoil).toBeGreaterThan(PISTOL_WEAPON.recoil);
  });
});