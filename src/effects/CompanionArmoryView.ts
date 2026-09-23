import Phaser from 'phaser';
import { ScrollPanel } from './ScrollPanel';
import type { ViewportState } from '../logic/pinchViewport';
import type { ExplorationSystem } from '../systems/ExplorationSystem';
import type { LastStandArmory } from '../systems/LastStandArmory';
import { WEAPON_DEFINITIONS } from '../config/weaponConfig';
import type { WeaponId } from '../logic/weapon';
import { t } from '../systems/UserSettings';

export function renderCompanionArmory(scene: Phaser.Scene, parent: Phaser.GameObjects.Container,
  box: { x: number; y: number; width: number; height: number }, exploration: ExplorationSystem,
  armory: LastStandArmory, offset: ViewportState, refresh: () => void, start: () => void): void {
  parent.add(scene.add.rectangle(box.x, box.y, box.width, box.height, 0x30281f).setOrigin(0));
  const roster = exploration.companions.getActive();
  armory.syncCompanions(roster.map(ally => ally.id));
  const ammo = exploration.getState().resources.ammo;
  const owned = armory.getState().owned;
  const width = box.width - 24;
  const contentHeight = 160 + (2 + roster.length) * (100 + (owned.length + 1) * 42);
  const panel = new ScrollPanel(scene, parent, { x: box.x + 12, y: box.y + 12, width, height: box.height - 24 },
    width, contentHeight, offset, 'contain', { zoomEnabled: false });
  const text = (x: number, y: number, label: string, size = 14) => {
    const item = scene.add.text(x, y, label, { fontFamily: 'Arial', fontSize: size, color: '#ead9b8' }).setWordWrapWidth(width - x - 8);
    panel.content.add(item); return item;
  };
  const button = (y: number, label: string, action: () => void, enabled = true) => {
    panel.content.add(scene.add.rectangle(0, y, width, 36, enabled ? 0x802c24 : 0x4a4136).setOrigin(0));
    text(8, y + 9, label, 13);
    if (enabled) panel.onTap({ x: 0, y, width, height: 36 }, action);
  };
  text(0, 0, t('Night preparation'), 20);
  text(0, 32, t('Ammo {ammo} · Deployment cost {cost}', { ammo, cost: armory.getDeployedIds().length }), 14);
  let y = 70;
  for (const slot of [0, 1] as const) {
    const weapon = armory.getState().slots[slot];
    text(0, y, `${t('Player')} · ${t('WEAPON SLOT {slot}', { slot: slot + 1 })}`, 16); y += 30;
    button(y, weapon ? `${t('Unequip')} · ${t(WEAPON_DEFINITIONS[weapon as WeaponId].name)}` : t('EMPTY'), () => { armory.clickSlot(slot); refresh(); }, !!weapon); y += 42;
    for (const id of owned) {
      button(y, t(WEAPON_DEFINITIONS[id as WeaponId].name), () => {
        if (armory.selectWeapon(id)) { armory.clickSlot(slot); refresh(); }
      }, !weapon && !armory.isAssigned(id)); y += 42;
    }
    y += 28;
  }
  for (const ally of roster) {
    text(0, y, `${ally.firstName} ${ally.lastName} · ${t('Courage')} ${ally.courage}`, 16); y += 30;
    const deployed = armory.getDeployedIds().includes(ally.id);
    button(y, t(deployed ? 'Participating · Ammo 1' : 'Stay at base'), () => { armory.toggleDeployment(ally.id, ammo); refresh(); }, deployed || armory.getDeployedIds().length < ammo); y += 42;
    const weapon = armory.getCompanionWeapon(ally.id);
    button(y, `${weapon ? '+' : '✓'} ${t('Worn Pistol')}`, () => { armory.assignCompanion(ally.id, null); refresh(); }); y += 42;
    for (const id of owned) {
      button(y, `${weapon === id ? '✓' : '+'} ${t(WEAPON_DEFINITIONS[id as WeaponId].name)}`, () => {
        if (armory.assignCompanion(ally.id, id)) refresh();
      }, !armory.isAssigned(id)); y += 42;
    }
    y += 28;
  }
  button(y, t('Day {day} · Start defense', { day: exploration.getState().day }), start,
    armory.canStartDefense() && armory.getDeployedIds().length <= ammo);
}
